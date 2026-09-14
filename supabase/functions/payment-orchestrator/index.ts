import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})
const IN_PROGRESS=new Set(['awaiting_user_auth','submitted','processing'])

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return json({error:"method_not_allowed"},405)
  const auth=req.headers.get("Authorization"); if(!auth) return json({error:"unauthorized"},401)
  const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:userError}=await client.auth.getUser(); if(userError||!user) return json({error:"unauthorized"},401)
  const {data:profile}=await client.from("profiles").select("role,full_name").eq("id",user.id).maybeSingle(); if(!profile||!['admin','reviewer'].includes(profile.role)) return json({error:"forbidden"},403)
  const b=await req.json().catch(()=>({})) as {payment_request_id?:string}; if(!b.payment_request_id) return json({error:"payment_request_id_required"},400)
  const {data:payment,error:paymentError}=await client.from("payment_requests").select("*").eq("id",b.payment_request_id).maybeSingle(); if(paymentError||!payment) return json({error:"payment_request_not_found"},404)

  if(IN_PROGRESS.has(payment.status)||payment.provider_payment_id){
    return json({ok:true,code:"ALREADY_SUBMITTED",payment_request_id:payment.id,status:payment.status,provider_payment_id:payment.provider_payment_id||null,message:"This payment request has already entered the provider flow and will not be submitted twice."},200)
  }
  if(payment.status!=="draft") return json({error:"invalid_payment_state",status:payment.status},409)

  const {data:account}=await client.from("bank_accounts").select("id,status,withdrawals_enabled,provider_connection_id").eq("id",payment.account_id).maybeSingle(); if(!account) return json({error:"account_not_found"},404)
  if(account.status!=="active") return json({error:"account_not_active"},409)
  if(!account.withdrawals_enabled) return json({error:"withdrawals_disabled"},409)

  await client.from("audit_logs").insert({actor_id:user.id,actor_label:profile.full_name||user.email||'operator',action:'payment_provider_flow_requested',resource_type:'payment_request',resource_id:payment.id,detail:'Provider-hosted payment authorization requested',severity:'info'}).catch(()=>null)

  return json({ok:false,code:"PROVIDER_ADAPTER_NOT_CONFIGURED",payment_request_id:payment.id,message:"Provider flow is locked until a licensed payment-initiation adapter is configured. Final authorization must occur through provider-hosted OAuth/SCA; this console never accepts bank passwords, PINs, OTPs or session cookies."},409)
})
