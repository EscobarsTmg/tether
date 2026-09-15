import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, GET, OPTIONS",
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})
const SYNC_COOLDOWN_MS=60_000

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders})
  if(req.method!=="POST") return json({error:"method_not_allowed"},405)
  try {
    const auth=req.headers.get("Authorization")
    if(!auth) return json({error:"unauthorized"},401)
    const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}})
    const {data:{user},error:userError}=await client.auth.getUser()
    if(userError||!user) return json({error:"unauthorized"},401)
    const {data:profile}=await client.from("profiles").select("role,full_name").eq("id",user.id).maybeSingle()
    if(!profile||!['admin','reviewer'].includes(profile.role)) return json({error:"forbidden"},403)
    const b=await req.json().catch(()=>({})) as {connection_id?:string}
    if(!b.connection_id) return json({error:"connection_id_required"},400)
    const {data:connection,error}=await client.from("bank_connections").select("*").eq("id",b.connection_id).maybeSingle()
    if(error||!connection) return json({error:"connection_not_found"},404)
    const lastSync=connection.last_sync_at ? new Date(connection.last_sync_at).getTime() : 0
    const remaining=SYNC_COOLDOWN_MS-(Date.now()-lastSync)
    if(lastSync && remaining>0) return json({ok:false,code:"SYNC_COOLDOWN",retry_after_ms:remaining},429)
    await client.from("audit_logs").insert({actor_id:user.id,actor_label:profile.full_name||user.email||'operator',action:'bank_sync_requested',resource_type:'bank_connection',resource_id:connection.id,detail:`Sync requested for ${connection.provider}`,severity:'info'}).catch(()=>null)
    return json({ok:false,code:"PROVIDER_ADAPTER_NOT_CONFIGURED",provider:connection.provider,message:"Live sync is ready for a licensed Open Banking adapter."},409)
  } catch(error) {
    return json({error:error instanceof Error?error.message:String(error)},500)
  }
})
