import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type BankAccount = { id:string; bank_name:string; account_name:string; iban_masked:string; currency:string; balance:number; deposits_enabled:boolean; withdrawals_enabled:boolean; status:string; updated_at:string }
export type Tx = { id:string; external_ref:string|null; account_id:string|null; occurred_at:string; direction:string; method:string; counterparty:string|null; counterparty_iban_masked:string|null; amount:number; balance_after:number|null; status:string }
export type Movement = { id:string; account_id:string|null; occurred_at:string; movement_type:string; reference:string|null; source:string; amount:number; running_balance:number|null; status:string }
export type Connection = { id:string; provider:string; institution_name:string|null; status:string; scopes:string[]; consent_expires_at:string|null; last_sync_at:string|null }
export type Profile = { id:string; full_name:string|null; role:string; avatar_url:string|null; created_at:string }
export type Audit = { id:string; actor_label:string|null; action:string; resource_type:string|null; resource_id:string|null; detail:string|null; severity:string; created_at:string }
export type History = { id:string; account_id:string|null; event_type:string; event_message:string; status:string; created_at:string }
export type ReconciliationItem = { id:string; account_id:string|null; ledger_balance:number; bank_balance:number; difference:number; status:string; created_at:string }

export function useOpsData() {
  const [accounts,setAccounts]=useState<BankAccount[]>([])
  const [transactions,setTransactions]=useState<Tx[]>([])
  const [movements,setMovements]=useState<Movement[]>([])
  const [connections,setConnections]=useState<Connection[]>([])
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [auditLogs,setAuditLogs]=useState<Audit[]>([])
  const [history,setHistory]=useState<History[]>([])
  const [reconciliation,setReconciliation]=useState<ReconciliationItem[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)

  const load=useCallback(async()=>{
    if(!supabase){setLoading(false);setError('Supabase is not configured');return}
    setLoading(true); setError(null)
    const [a,t,m,c,p,l,h,r]=await Promise.all([
      supabase.from('bank_accounts').select('*').order('updated_at',{ascending:false}),
      supabase.from('transactions').select('*').order('occurred_at',{ascending:false}).limit(200),
      supabase.from('account_movements').select('*').order('occurred_at',{ascending:false}).limit(200),
      supabase.from('bank_connections').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('*').order('created_at',{ascending:false}),
      supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(200),
      supabase.from('account_history').select('*').order('created_at',{ascending:false}).limit(200),
      supabase.from('reconciliation_items').select('*').order('created_at',{ascending:false}).limit(100),
    ])
    const firstError=[a,t,m,c,p,l,h,r].find(x=>x.error)?.error
    if(firstError){setError(firstError.message)}
    setAccounts((a.data||[]) as BankAccount[]); setTransactions((t.data||[]) as Tx[]); setMovements((m.data||[]) as Movement[])
    setConnections((c.data||[]) as Connection[]); setProfiles((p.data||[]) as Profile[]); setAuditLogs((l.data||[]) as Audit[])
    setHistory((h.data||[]) as History[]); setReconciliation((r.data||[]) as ReconciliationItem[])
    setLoading(false)
  },[])

  useEffect(()=>{ void load(); if(!supabase) return; const client=supabase; const channel=client.channel('ops-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'bank_accounts'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'transactions'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'account_movements'},()=>void load())
    .on('postgres_changes',{event:'*',schema:'public',table:'bank_connections'},()=>void load())
    .subscribe()
    return()=>{void client.removeChannel(channel)}
  },[load])

  return {accounts,transactions,movements,connections,profiles,auditLogs,history,reconciliation,loading,error,reload:load}
}
