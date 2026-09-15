import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, GET, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return json({error:'method_not_allowed'},405);
  try {
    const auth=req.headers.get('Authorization');
    if(!auth) return json({error:'unauthorized'},401);
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
    const {data:{user}}=await client.auth.getUser();
    if(!user) return json({error:'unauthorized'},401);
    const {data:profile}=await client.from('profiles').select('role,full_name').eq('id',user.id).maybeSingle();
    if(!profile||!['admin','reviewer'].includes(profile.role)) return json({error:'forbidden'},403);

    const body=await req.json().catch(()=>({}));
    const token=Deno.env.get('GITHUB_AUTOMATION_TOKEN');
    const repo=Deno.env.get('GITHUB_AUTOMATION_REPO')||'EscobarsTmg/tether';
    const workflow='automation.yml';
    if(body?.action==='health'){
      const result={github_token:Boolean(token),github_api:false,workflow_exists:false};
      if(!token) return json(result);
      try{
        const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
        const api=await fetch(`https://api.github.com/repos/${repo}`,{headers});result.github_api=api.ok;
        if(api.ok){const wf=await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}`,{headers});result.workflow_exists=wf.ok;}
      }catch{/* health stays false */}
      return json(result);
    }
    if(!token) return json({success:false,error:'github_token_missing',message:'GitHub Automation Token eksik.'},409);
    const response=await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({ref:'main'})});
    await client.from('audit_logs').insert({actor_id:user.id,actor_label:profile.full_name||user.email||'operator',action:'automation_dispatch',resource_type:'github_actions',detail:response.ok?'Manual automation run requested':`Dispatch failed HTTP ${response.status}`,severity:response.ok?'info':'warning'});
    if(!response.ok){const detail=await response.text().catch(()=>'');return json({success:false,error:'github_dispatch_failed',detail:detail.slice(0,300)},502);}
    return json({success:true,message:'Workflow tetiklendi'});
  } catch(error) {
    return json({error:error instanceof Error?error.message:String(error)},500);
  }
});
