import { CheckCircle2, CircleAlert, Database, RefreshCw } from 'lucide-react'
import { useSportsData } from '../lib/sportsData'

const fmt=(value:string|null)=>value?new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'Never'
export default function SportsProvidersPage(){
  const{providers,syncRuns,providerById,loading,error,reload}=useSportsData()
  return <div className="page"><div className="two-col">
    <section className="panel"><div className="panel-head"><div><h2>Sports providers</h2><p>Provider registry. Credentials stay in environment variables, not this table.</p></div><button className="secondary-btn" onClick={()=>void reload()}><RefreshCw size={14}/> Refresh</button></div>
      {error&&<p>{error}</p>}<div className="table-wrap"><table><thead><tr><th>Provider</th><th>Mode</th><th>Last sync</th><th>Status</th></tr></thead><tbody>{providers.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="subline">{p.provider_key}</small></td><td>{p.mode}</td><td>{fmt(p.last_sync_at)}</td><td>{p.active?<span className="badge active"><CheckCircle2 size={12}/> active</span>:<span className="badge disabled">disabled</span>}</td></tr>)}</tbody></table></div>
    </section>
    <section className="panel"><div className="panel-head"><div><h2>Sync health</h2><p>Latest ingestion runs</p></div></div>
      <div className="health-list">{syncRuns.slice(0,12).map(r=><div className="health-row" key={r.id}><div><strong>{providerById.get(r.provider_id||'')?.name||'Provider'}</strong><span>{fmt(r.started_at)} · {r.items_upserted}/{r.items_received} items</span></div>{r.status==='failed'?<CircleAlert size={18}/>:<Database size={18}/>}</div>)}{!loading&&!syncRuns.length&&<p>No sync runs yet.</p>}</div>
    </section>
  </div></div>
}
