import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={"access-control-allow-origin":"*","access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return json({success:false,error:'method_not_allowed',message:'Yalnızca POST istekleri desteklenir.'},405);

  const auth=req.headers.get('Authorization');
  if(!auth) return json({success:false,error:'unauthorized',message:'Oturum doğrulanamadı.'},401);

  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user) return json({success:false,error:'unauthorized',message:'Oturum doğrulanamadı.'},401);

  const {data:profile}=await client.from('profiles').select('role,full_name').eq('id',user.id).maybeSingle();
  if(!profile||!['admin','reviewer'].includes(profile.role)) return json({success:false,error:'forbidden',message:'Bu işlem için admin veya reviewer yetkisi gerekir.'},403);

  const body=await req.json().catch(()=>({})) as {action?:'health'|'dispatch'};
  const action=body.action||'dispatch';
  const token=Deno.env.get('GITHUB_AUTOMATION_TOKEN');
  const repo=Deno.env.get('GITHUB_AUTOMATION_REPO')||'EscobarsTmg/tether';

  if(action==='health'){
    return json({success:true,githubAutomationTokenConfigured:Boolean(token),repository:repo,message:token?'GitHub Automation Token yapılandırılmış.':'GitHub Automation Token eksik, lütfen Supabase Secrets\'a ekleyin'});
  }

  if(!token){
    return json({success:false,error:'missing_github_automation_token',message:'GitHub Automation Token eksik. GITHUB_AUTOMATION_TOKEN secret\'ını Supabase Edge Function Secrets bölümüne ekleyin.'},503);
  }

  let response:Response;
  try{
    response=await fetch(`https://api.github.com/repos/${repo}/actions/workflows/automation.yml/dispatches`,{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
      body:JSON.stringify({ref:'main'})
    });
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    return json({success:false,error:'github_network_error',message:`GitHub API bağlantısı kurulamadı: ${message}`},502);
  }

  if(!response.ok){
    const githubBody=await response.text().catch(()=>'');
    await client.from('audit_logs').insert({actor_id:user.id,actor_label:profile.full_name||user.email||'operator',action:'automation_dispatch_failed',resource_type:'github_actions',detail:`Dispatch failed HTTP ${response.status}`,severity:'warning'});
    return json({success:false,error:'github_dispatch_failed',message:`GitHub Actions tetiklenemedi. HTTP ${response.status}. Token için repository Actions: write yetkisini ve workflow dosyasını kontrol edin.`,github:githubBody.slice(0,500)},502);
  }

  await client.from('audit_logs').insert({actor_id:user.id,actor_label:profile.full_name||user.email||'operator',action:'automation_dispatch',resource_type:'github_actions',detail:'Manual automation workflow requested',severity:'info'});
  return json({success:true,message:'Workflow tetiklendi'});
});
