import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})
const maskIban=(value:string)=>{const v=value.replace(/\s+/g,'').toUpperCase();if(v.length<8)return null;return `${v.slice(0,4)} •••• ${v.slice(-4)}`}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST") return json({error:"method_not_allowed"},405)
  const auth=req.headers.get("Authorization"); if(!auth) return json({error:"unauthorized"},401)
  const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:userError}=await client.auth.getUser(); if(userError||!user) return json({error:"unauthorized"},401)
  const {data:profile}=await client.from("profiles").select("role,full_name").eq("id",user.id).maybeSingle()
  if(!profile||!['admin','reviewer'].includes(profile.role)) return json({error:"forbidden"},403)

  const b=await req.json().catch(()=>({})) as {account_id?:string;amount?:number;currency?:string;destination_iban?:string;destination_name?:string;description?:string}
  const amount=Number(b.amount); const currency=String(b.currency||'').trim().toUpperCase()
  if(!b.account_id) return json({error:"account_id_required"},400)
  if(!Number.isFinite(amount)||amount<=0) return json({error:"invalid_amount"},400)
  if(!/^[A-Z]{3}$/.test(currency)) return json({error:"invalid_currency"},400)
  if(!b.destination_iban) return json({error:"destination_required"},400)
  const masked=maskIban(b.destination_iban); if(!masked) return json({error:"invalid_destination"},400)

  const {data:account}=await client.from("bank_accounts").select("id,currency,withdrawals_enabled,status").eq("id",b.account_id).maybeSingle()
  if(!account) return json({error:"account_not_found"},404)
  if(account.status!=='active') return json({error:"account_not_active"},409)
  if(!account.withdrawals_enabled) return json({error:"withdrawals_disabled"},409)
  if(account.currency&&account.currency!==currency) return json({error:"currency_mismatch",account_currency:account.currency},409)

  const {data:recent}=await client.from("payment_requests").select("id,status,created_at").eq("account_id",b.account_id).eq("amount",amount).eq("currency",currency).eq("destination_iban_masked",masked).gte("created_at",new Date(Date.now()-60_000).toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle()
  if(recent) return json({ok:true,code:"RECENT_DUPLICATE",payment_request_id:recent.id,status:recent.status,message:"A matching payment draft was created within the last minute; a duplicate was not created."},200)

  const {data:payment,error}=await client.from("payment_requests").insert({account_id:b.account_id,direction:'withdrawal',amount,currency,destination_iban_masked:masked,destination_name:b.destination_name?.trim()||null,description:b.description?.trim()||null,requested_by:user.id,status:'draft'}).select('*').single()
  if(error) return json({error:"draft_create_failed",detail:error.message},400)
  await client.from("audit_logs").insert({actor_id:user.id,actor_label:profile.full_name||user.email||'operator',action:'payment_draft_created',resource_type:'payment_request',resource_id:payment.id,detail:`Draft created for ${amount} ${currency}`,severity:'info'}).catch(()=>null)
  return json({ok:true,payment_request:payment},201)
})
