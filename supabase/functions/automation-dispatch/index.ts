import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"access-control-allow-origin":"*","access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({error:'method_not_allowed'},405);
  const auth=req.headers.get('Authorization');
  if(!auth) return json({error:'unauthorized'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await client.auth.getUser();
  if(!user) return json({error:'unauthorized'},401);
  const {data:profile}=await client.from('profiles').select('role,full_name').eq('id',user.id).maybeSingle();
  if(!profile||!['admin','reviewer'].includes(profile.role)) return json({error:'forbidden'},403);

  const token=Deno.env.get('GITHUB_AUTOMATION_TOKEN');
  const repo=Deno.env.get('GITHUB_AUTOMATION_REPO')||'EscobarsTmg/tether';
  if(!token) return json({error:'github_dispatch_not_configured'},409);

  const response=await fetch(`https://api.github.com/repos/${repo}/actions/workflows/automation.yml/dispatches`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:JSON.stringify({ref:'main'})
  });
  await client.from('audit_logs').insert({actor_id:user.id,actor_label:profile.full_name||user.email||'operator',action:'automation_dispatch',resource_type:'github_actions',detail:response.ok?'Manual automation run requested':`Dispatch failed HTTP ${response.status}`,severity:response.ok?'info':'warning'});
  if(!response.ok) return json({error:'dispatch_failed',status:response.status},502);
  return json({ok:true,message:'Automation workflow queued.'});
});
