import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, GET, OPTIONS',
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}})

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST') return json({error:'Method not allowed'},405)
  try {
    const auth=req.headers.get('Authorization')
    if(!auth) return json({error:'Unauthorized'},401)
    const url=Deno.env.get('SUPABASE_URL')!,publishable=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient=createClient(url,publishable,{global:{headers:{Authorization:auth}}})
    const{data:{user},error:userError}=await userClient.auth.getUser()
    if(userError||!user) return json({error:'Unauthorized'},401)
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
    const{data:profile}=await admin.from('profiles').select('role').eq('id',user.id).single()
    if(profile?.role!=='admin') return json({error:'Forbidden'},403)
    const body=await req.json().catch(()=>({})) as {email?:unknown}
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():''
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:'Valid email required'},400)
    const{data,error}=await admin.auth.admin.inviteUserByEmail(email)
    if(error) return json({error:error.message},400)
    if(data.user) await admin.from('profiles').upsert({id:data.user.id,email,role:'viewer',active:true},{onConflict:'id'})
    await admin.from('audit_logs').insert({user_id:user.id,actor_id:user.id,actor_label:user.email??'admin',action:'user_invited',resource_type:'profile',resource_id:data.user?.id??null,detail:`User invited: ${email}`,severity:'info',metadata:{email}})
    return json({ok:true,user_id:data.user?.id??null})
  } catch(error) {
    return json({error:error instanceof Error?error.message:String(error)},500)
  }
})
