import {Database,RefreshCw} from 'lucide-react'
import {useGameCatalog} from '../lib/gameCatalog'
const fmt=(v:string|null)=>v?new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'Never'
export default function GameProvidersPage(){
 const{providers,syncRuns,providerById,games,loading,error,reload}=useGameCatalog()
 return <div className="page"><div className="stats-grid">
  <div className="stat-card"><span>Providers</span><strong>{providers.length}</strong><small>catalog sources</small></div>
  <div className="stat-card"><span>Total games</span><strong>{games.length}</strong><small>normalized records</small></div>
  <div className="stat-card"><span>Live casino</span><strong>{games.filter(x=>x.game_type==='live_casino').length}</strong><small>catalog entries</small></div>
  <div className="stat-card"><span>Slots</span><strong>{games.filter(x=>x.game_type==='slot').length}</strong><small>catalog entries</small></div>
 </div><div className="two-col"><section className="panel"><div className="panel-head"><div><h2>Game providers</h2><p>Provider registry and sync state.</p></div><button className="secondary-btn" onClick={()=>void reload()}><RefreshCw size={14}/> Refresh</button></div>
 {error&&<p>{error}</p>}<div className="table-wrap"><table><thead><tr><th>Provider</th><th>Type</th><th>Last sync</th><th>Status</th></tr></thead><tbody>{providers.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="subline">{p.provider_key}</small></td><td>{p.provider_type}</td><td>{fmt(p.last_sync_at)}</td><td>{p.active?<span className="badge active">active</span>:<span className="badge disabled">disabled</span>}</td></tr>)}</tbody></table></div></section>
 <section className="panel"><div className="panel-head"><div><h2>Sync runs</h2><p>Latest provider catalog imports</p></div></div><div className="health-list">{syncRuns.slice(0,20).map(r=><div className="health-row" key={r.id}><div><strong>{providerById.get(r.provider_id||'')?.name||'Provider'}</strong><span>{fmt(r.started_at)} · {r.items_upserted}/{r.items_received}</span></div><Database size={17}/></div>)}{!loading&&!syncRuns.length&&<p>No sync runs yet.</p>}</div></section></div></div>
}
