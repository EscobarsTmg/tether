import { FormEvent, useState } from 'react'
import { Plus, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { bankCatalog, bankByProvider } from '../lib/bankCatalog'
import { useOpsData } from '../lib/opsData'
import { Badge, Empty, PageState, dt } from '../components/ui/OperationsUi'

function AddBankModal({close,reload}:{close:()=>void;reload:()=>void}){
  const[code,setCode]=useState(bankCatalog[0]?.code||'')
  const[msg,setMsg]=useState('')
  const[saving,setSaving]=useState(false)
  async function submit(e:FormEvent){
    e.preventDefault();if(!supabase)return
    const item=bankCatalog.find(x=>x.code===code);if(!item)return
    setSaving(true);setMsg('')
    const {data,error}=await supabase.functions.invoke('connection-register',{body:{provider:`tr:${item.code.toLowerCase()}`,institution_name:item.shortName,scopes:['accounts','balances','transactions']}})
    if(error)setMsg(error.message)
    else{setMsg(data?.message||'Connection created.');await reload()}
    setSaving(false)
  }
  return <div className="ops-modalback" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}><form className="ops-modal" onSubmit={submit}><div className="ops-modalhead"><div><h2>Add bank connection</h2><p>Create a provider connection record and continue with authorized consent when an adapter is configured.</p></div><button type="button" onClick={close}><X size={17}/></button></div><label>Institution<select value={code} onChange={e=>setCode(e.target.value)}>{bankCatalog.map(b=><option key={b.code} value={b.code}>{b.shortName} · {b.category}</option>)}</select></label><div className="ops-callout"><ShieldCheck size={17}/><span>No bank password, PIN, OTP or session cookie is collected here. Live access requires a provider-hosted OAuth/SCA consent flow.</span></div>{msg&&<div className="ops-formmsg">{msg}</div>}<div className="ops-modalactions"><button type="button" className="ops-ghost" onClick={close}>Cancel</button><button className="ops-primary" disabled={saving}>{saving?'Creating…':'Add bank'}</button></div></form></div>
}

export default function BankConnectionsPage(){
  const d=useOpsData();const[modal,setModal]=useState(false);const[msg,setMsg]=useState('');const[busy,setBusy]=useState<string|null>(null)
  async function sync(id:string){if(!supabase)return;setBusy(id);setMsg('');const {data,error}=await supabase.functions.invoke('bank-sync',{body:{connection_id:id}});setMsg(error?.message||data?.message||'Sync request sent');await d.reload();setBusy(null)}
  return <div className="ops-page"><PageState loading={d.loading} error={d.error} reload={d.reload}/>{!d.loading&&!d.error&&<><div className="ops-pageactions"><div><h2>Provider registry</h2><p>Add institutions, inspect consent state and run authorized synchronization.</p></div><button className="ops-primary" onClick={()=>setModal(true)}><Plus size={15}/> Add bank</button></div>{msg&&<div className="ops-banner">{msg}</div>}<section className="ops-panel">{d.connections.length?<div className="ops-tablewrap"><table className="ops-table"><thead><tr><th>Provider</th><th>Institution</th><th>Status</th><th>Scopes</th><th>Last sync</th><th>Consent expiry</th><th></th></tr></thead><tbody>{d.connections.map(c=>{const catalog=bankByProvider(c.provider);const canSync=c.status==='connected';return <tr key={c.id}><td><strong>{catalog?.shortName||c.provider}</strong><small>{c.provider}</small></td><td>{c.institution_name||catalog?.name||'—'}</td><td><Badge value={c.status}/></td><td>{(c.scopes||[]).join(', ')||'—'}</td><td>{dt(c.last_sync_at)}</td><td>{dt(c.consent_expires_at)}</td><td className="right"><button className="ops-small" disabled={!canSync||busy===c.id} title={canSync?'Sync connected account':'Provider consent is not connected yet'} onClick={()=>void sync(c.id)}><RefreshCw size={13}/>{busy===c.id?' Syncing…':' Sync'}</button></td></tr>})}</tbody></table></div>:<Empty title="No banks configured" detail="Use Add bank to create the connection record. Live balances and transactions appear only after an authorized provider consent is connected."/>}</section>{modal&&<AddBankModal close={()=>setModal(false)} reload={d.reload}/>}</>}</div>
}
