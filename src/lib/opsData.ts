import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type BankAccount = { id:string; bank_name:string; account_name:string; iban_masked:string; currency:string; balance:number; deposits_enabled:boolean; withdrawals_enabled:boolean; status:string; updated_at:string }
export type Tx = { id:string; external_ref:string|null; account_id:string|null; occurred_at:string; direction:string; method:string; counterparty:string|null; counterparty_iban_masked:string|null; amount:number; balance_after:number|null; status:string }
export type Movement = { id:string; account_id:string|null; occurred_at:string; movement_type:string; reference:string|null; source:string; amount:number; running_balance:number|null; status:string }
export type Connection = { id:string; provider:string; external_connection_id:string|null; institution_name:string|null; status:string; scopes:string[]; consent_expires_at:string|null; last_sync_at:string|null }
export type PaymentRequest = { id:string; account_id:string|null; direction:'withdrawal'|'transfer'; amount:number; currency:string; destination_iban_masked:string|null; destination_name:string|null; description:string|null; provider_payment_id:string|null; status:string; authorization_url:string|null; requested_by:string|null; approved_by:string|null; approved_at:string|null; created_at:string; updated_at:string }
export type Profile = { id:string; full_name:string|null; role:string; avatar_url:string|null; created_at:string }
export type Audit = { id:string; actor_label:string|null; action:string; resource_type:string|null; resource_id:string|null; detail:string|null; severity:string; created_at:string }
export type History = { id:string; account_id:string|null; event_type:string; event_message:string; status:string; created_at:string }
export type ReconciliationItem = { id:string; account_id:string|null; ledger_balance:number; bank_balance:number; difference:number; status:string; created_at:string }

type QueryResult = { data: unknown[] | null; error: { message:string } | null }

export function useOpsData() {
  const [accounts,setAccounts]=useState<BankAccount[]>([])
  const [transactions,setTransactions]=useState<Tx[]>([])
  const [movements,setMovements]=useState<Movement[]>([])
  const [connections,setConnections]=useState<Connection[]>([])
  const [paymentRequests,setPaymentRequests]=useState<PaymentRequest[]>([])
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [auditLogs,setAuditLogs]=useState<Audit[]>([])
  const [history,setHistory]=useState<History[]>([])
  const [reconciliation,setReconciliation]=useState<ReconciliationItem[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [warnings,setWarnings]=useState<string[]>([])

  const load=useCallback(async()=>{
    if(!supabase){setLoading(false);setError('Supabase is not configured');return}
    setLoading(true); setError(null); setWarnings([])

    const results=await Promise.all([
      supabase.from('bank_accounts').select('*').order('updated_at',{ascending:false}),
      supabase.from('transactions').select('*').order('occurred_at',{ascending:false}).limit(200),
      supabase.from('account_movements').select('*').order('occurred_at',{ascending:false}).limit(200),
      supabase.from('bank_connections').select('*').order('created_at',{ascending:false}),
      supabase.from('payment_requests').select('*').order('created_at',{ascending:false}).limit(200),
      supabase.from('profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(200),
      supabase.from('account_history').select('*').order('created_at',{ascending:false}).limit(200),
      supabase.from('reconciliation_items').select('*').order('created_at',{ascending:false}).limit(100),
    ]) as QueryResult[]

    const [a,t,m,c,pay,p,l,h,r]=results
    const coreErrors=[a,t,c].filter(x=>x.error).map(x=>x.error!.message)
    const optionalErrors=[m,pay,p,l,h,r].filter(x=>x.error).map(x=>x.error!.message)
    if(coreErrors.length) setError(coreErrors[0])
    setWarnings(Array.from(new Set(optionalErrors)))

    setAccounts((a.data||[]) as BankAccount[])
    setTransactions((t.data||[]) as Tx[])
    setMovements((m.data||[]) as Movement[])
    setConnections((c.data||[]) as Connection[])
    setPaymentRequests((pay.data||[]) as PaymentRequest[])
    setProfiles((p.data||[]) as Profile[])
    setAuditLogs((l.data||[]) as Audit[])
    setHistory((h.data||[]) as History[])
    setReconciliation((r.data||[]) as ReconciliationItem[])
    setLoading(false)
  },[])

  useEffect(()=>{ void load(); if(!supabase) return; const client=supabase; const channel=client.channel('ops-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'bank_accounts'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'transactions'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'account_movements'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'bank_connections'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'payment_requests'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'account_history'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'reconciliation_items'},()=>void load())
    .subscribe()
    return()=>{void client.removeChannel(channel)}
  },[load])

  return {accounts,transactions,movements,connections,paymentRequests,profiles,auditLogs,history,reconciliation,loading,error,warnings,reload:load}
}
