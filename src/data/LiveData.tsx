import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AnyRow = Record<string, any>
export type LiveAccount = { id:string; bank:string; name:string; iban:string; balance:number; deposits:boolean; withdrawals:boolean; status:string; currency:string }
export type LiveTransaction = { id:string; date:string; type:string; method:string; counterparty:string; iban:string; account:string; bank:string; amount:number; balanceAfter:number; status:string }
export type LiveMovement = { id:string; time:string; kind:string; bank:string; account:string; reference:string; source:string; amount:number; runningBalance:number; status:string }
export type LiveHistory = { time:string; bank:string; account:string; event:string; status:string }
export type LiveReconciliation = { id:string; account:string; bank:string; ledgerBalance:number; bankBalance:number; difference:number; checkedAt:string; status:string }
export type LiveUser = { id:string; name:string; email:string; role:string; group:string; lastSeen:string; status:string }
export type LiveAudit = { id:string; action:string; detail:string; actor:string; resource:string; time:string; severity:string }

type State = {
  accounts:LiveAccount[]; transactions:LiveTransaction[]; movements:LiveMovement[]; history:LiveHistory[];
  reconciliationRows:LiveReconciliation[]; users:LiveUser[]; auditLogs:LiveAudit[];
  loading:boolean; connected:boolean; error:string; refresh:()=>Promise<void>
}

const Ctx=createContext<State|null>(null)
const num=(v:any)=>Number(v ?? 0) || 0
const str=(...v:any[])=>String(v.find(x=>x!==undefined&&x!==null&&x!=='') ?? '')
const bool=(v:any)=>v===true||v===1||v==='true'||v==='enabled'
const fmt=(v:any)=>{ if(!v) return ''; const d=new Date(v); return Number.isNaN(d.getTime())?String(v):d.toLocaleString('tr-TR') }

async function safeTable(table:string){
  if(!supabase) return [] as AnyRow[]
  const {data,error}=await supabase.from(table).select('*').order('created_at',{ascending:false})
  if(error){ console.warn(`[live-data] ${table}:`,error.message); return [] as AnyRow[] }
  return (data||[]) as AnyRow[]
}

export function LiveDataProvider({children}:{children:ReactNode}){
  const [raw,setRaw]=useState<Record<string,AnyRow[]>>({}); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  const refresh=useCallback(async()=>{
    if(!supabase){ setLoading(false); setError('Supabase environment is not configured.'); return }
    setLoading(true); setError('')
    try{
      const tables=['bank_accounts','transactions','account_movements','account_history','reconciliation_items','profiles','audit_logs']
      const values=await Promise.all(tables.map(safeTable)); setRaw(Object.fromEntries(tables.map((t,i)=>[t,values[i]])))
    }catch(e){ setError(e instanceof Error?e.message:'Live data could not be loaded.') } finally{ setLoading(false) }
  },[])

  useEffect(()=>{ void refresh(); if(!supabase) return; const client=supabase
    const channel=client.channel('ops-live').on('postgres_changes',{event:'*',schema:'public'},()=>void refresh()).subscribe()
    return()=>{ void client.removeChannel(channel) }
  },[refresh])

  const value=useMemo<State>(()=>{
    const accounts=(raw.bank_accounts||[]).map((r):LiveAccount=>({id:str(r.id),bank:str(r.bank_name,r.bank,r.provider_name,'Bank'),name:str(r.account_name,r.name,r.holder_name,'Account'),iban:str(r.iban,r.account_number),balance:num(r.available_balance??r.balance),deposits:bool(r.deposits_enabled??r.deposit_enabled),withdrawals:bool(r.withdrawals_enabled??r.withdrawal_enabled),status:str(r.status,'active'),currency:str(r.currency,'TRY')}))
    const byId=new Map(accounts.map(a=>[a.id,a]))
    const transactions=(raw.transactions||[]).map((r):LiveTransaction=>{const a=byId.get(str(r.account_id));const amount=num(r.amount);return{id:str(r.id,r.external_transaction_id),date:fmt(r.transaction_date??r.created_at),type:str(r.direction,r.type,amount<0?'Withdrawal':'Deposit'),method:str(r.transfer_type,r.method,'Bank'),counterparty:str(r.counterparty_name,r.description,'—'),iban:str(r.counterparty_iban,r.iban,'—'),account:str(a?.name,r.account_name,'—'),bank:str(a?.bank,r.bank_name,'—'),amount,balanceAfter:num(r.balance_after),status:str(r.status,'posted')}})
    const movements=(raw.account_movements||[]).map((r):LiveMovement=>{const a=byId.get(str(r.account_id));return{id:str(r.id),time:fmt(r.occurred_at??r.created_at),kind:str(r.movement_type,r.kind,r.type,'Movement'),bank:str(a?.bank,r.bank_name,'—'),account:str(a?.name,r.account_name,'—'),reference:str(r.reference,r.external_id,r.id),source:str(r.source,'provider'),amount:num(r.amount),runningBalance:num(r.running_balance??r.balance_after),status:str(r.status,'posted')}})
    const history=(raw.account_history||[]).map((r):LiveHistory=>{const a=byId.get(str(r.account_id));return{time:fmt(r.created_at),bank:str(a?.bank,r.bank_name,'—'),account:str(a?.name,r.account_name,'—'),event:str(r.event,r.description,r.status,'Account event'),status:str(r.status,'active')}})
    const reconciliationRows=(raw.reconciliation_items||[]).map((r):LiveReconciliation=>{const a=byId.get(str(r.account_id));const ledger=num(r.ledger_balance);const bank=num(r.bank_balance);return{id:str(r.id),account:str(a?.name,r.account_name,'—'),bank:str(a?.bank,r.bank_name,'—'),ledgerBalance:ledger,bankBalance:bank,difference:num(r.difference??bank-ledger),checkedAt:fmt(r.checked_at??r.created_at),status:str(r.status,'matched')}})
    const users=(raw.profiles||[]).map((r):LiveUser=>({id:str(r.id),name:str(r.full_name,'User'),email:str(r.email,'—'),role:str(r.role,'viewer'),group:str(r.group_name,'Operations'),lastSeen:fmt(r.last_seen_at??r.updated_at),status:str(r.status,'active')}))
    const auditLogs=(raw.audit_logs||[]).map((r):LiveAudit=>({id:str(r.id),action:str(r.action,'Event'),detail:str(r.details,r.detail,r.description,'—'),actor:str(r.actor_name,r.actor_id,'system'),resource:str(r.resource_type,r.resource,'system'),time:fmt(r.created_at),severity:str(r.severity,'info')}))
    return{accounts,transactions,movements,history,reconciliationRows,users,auditLogs,loading,connected:isSupabaseConfigured&&!error,error,refresh}
  },[raw,loading,error,refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLiveData(){const v=useContext(Ctx);if(!v)throw new Error('useLiveData must be used inside LiveDataProvider');return v}
