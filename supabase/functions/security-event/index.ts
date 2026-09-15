import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})
const enc=new TextEncoder()

async function sha256(value:string){
  const digest=await crypto.subtle.digest("SHA-256",enc.encode(value))
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("")
}

function clientIp(req:Request){
  const raw=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||""
  return raw
}

function coarseNetwork(ip:string){
  if(!ip) return null
  if(ip.includes(".")){
    const p=ip.split(".")
    return p.length===4?`${p[0]}.${p[1]}.${p[2]}.0/24`:null
  }
  if(ip.includes(":")){
    const p=ip.split(":").filter(Boolean).slice(0,4)
    return p.length?`${p.join(":")}::/64`:null
  }
  return null
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return json({error:"method_not_allowed"},405)
  const auth=req.headers.get("Authorization")
  if(!auth?.startsWith("Bearer ")) return json({error:"unauthorized"},401)

  const url=Deno.env.get("SUPABASE_URL")!
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const salt=Deno.env.get("SECURITY_HASH_SALT")||"security-session-v1"
  if(!service) return json({error:"service_role_not_configured"},500)

  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:userError}=await userClient.auth.getUser()
  if(userError||!user) return json({error:"unauthorized"},401)

  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const body=await req.json().catch(()=>({})) as {event_type?:string;device_id?:string;device_label?:string;metadata?:Record<string,unknown>}
  const eventType=(body.event_type||"heartbeat").slice(0,80)
  const token=auth.slice(7)
  const sessionHash=await sha256(`${salt}:${token}`)
  const deviceHash=body.device_id?await sha256(`${salt}:device:${body.device_id}`):null
  const ua=(req.headers.get("user-agent")||"").slice(0,500)
  const network=coarseNetwork(clientIp(req))
  const now=new Date().toISOString()

  let risk=0
  const reasons:string[]=[]
  if(deviceHash){
    const {data:trusted}=await admin.from("trusted_devices").select("id,revoked_at").eq("user_id",user.id).eq("device_hash",deviceHash).maybeSingle()
    if(!trusted){risk+=20;reasons.push("new_device")}
    else if(trusted.revoked_at){risk+=60;reasons.push("revoked_device")}
  }else{risk+=10;reasons.push("device_id_missing")}

  if(network){
    const {data:knownNetwork}=await admin.from("app_sessions").select("id").eq("user_id",user.id).eq("ip_network",network).limit(1)
    if(!knownNetwork?.length){risk+=15;reasons.push("new_network")}
  }

  const expiresAt=user.aud?null:null
  const {data:session,error:sessionError}=await admin.from("app_sessions").upsert({
    user_id:user.id,
    session_hash:sessionHash,
    device_hash:deviceHash,
    device_label:body.device_label?.slice(0,120)||null,
    user_agent:ua||null,
    ip_network:network,
    risk_score:Math.min(risk,100),
    risk_reasons:reasons,
    last_seen_at:now,
    expires_at:expiresAt,
  },{onConflict:"session_hash"}).select("id,risk_score,risk_reasons,last_seen_at,device_label,ip_network").single()
  if(sessionError) return json({error:"session_registry_failed",detail:sessionError.message},500)

  if(deviceHash){
    await admin.from("trusted_devices").upsert({user_id:user.id,device_hash:deviceHash,label:body.device_label?.slice(0,120)||null,last_seen_at:now},{onConflict:"user_id,device_hash"})
  }

  await admin.from("security_events").insert({
    user_id:user.id,
    session_id:session.id,
    event_type:eventType,
    severity:risk>=60?"critical":risk>=35?"high":risk>=15?"warning":"info",
    request_id:req.headers.get("x-request-id")||crypto.randomUUID(),
    ip_network:network,
    user_agent:ua||null,
    metadata:{...(body.metadata||{}),risk_score:risk,risk_reasons:reasons},
  })

  return json({ok:true,session})
})
