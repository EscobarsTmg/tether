import {useMemo,useState} from 'react'
import {Gamepad2,Search} from 'lucide-react'
import {useGameCatalog} from '../lib/gameCatalog'

const fmt=(v:string|null)=>v?new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—'
export default function GameCatalogPage(){
  const{games,providerById,loading,error}=useGameCatalog()
  const[q,setQ]=useState('');const[type,setType]=useState('');const[provider,setProvider]=useState('')
  const rows=useMemo(()=>games.filter(g=>{
    const hay=[g.name,g.external_id,g.category,providerById.get(g.provider_id||'')?.name].join(' ').toLowerCase()
    return(!q||hay.includes(q.toLowerCase()))&&(!type||g.game_type===type)&&(!provider||g.provider_id===provider)
  }),[games,providerById,q,type,provider])
  const providers=useMemo(()=>{
    const seen=new Set<string>()
    return games.flatMap(g=>{
      const id=g.provider_id
      if(!id||seen.has(id))return []
      seen.add(id)
      const provider=providerById.get(id)
      return provider?[provider]:[]
    })
  },[games,providerById])
  return <div className="page"><div className="hero-strip"><div><span className="hero-kicker">GAME CATALOG</span><h2>Slot, live casino and table catalog</h2><p>Provider metadata is normalized into one internal catalog. RTP and multiplier fields are informational provider metadata.</p></div><Gamepad2 size={34}/></div>
    <section className="panel"><div className="panel-head"><div><h2>All games</h2><p>{loading?'Loading catalog...':rows.length+' records'}</p></div><div className="toolbar">
      <label className="search-box"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search game, provider..."/></label>
      <select value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option><option value="slot">Slot</option><option value="live_casino">Live casino</option><option value="table">Table</option><option value="instant">Instant</option><option value="virtual">Virtual</option><option value="other">Other</option></select>
      <select value={provider} onChange={e=>setProvider(e.target.value)}><option value="">All providers</option>{providers.map(p=><option key={p!.id} value={p!.id}>{p!.name}</option>)}</select>
    </div></div>
    {error&&<p>{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Game</th><th>Provider</th><th>Type</th><th>Category</th><th>Certified RTP</th><th>Volatility</th><th>Max X</th><th>State</th><th>Provider update</th></tr></thead><tbody>
      {rows.map(g=><tr key={g.id}><td><strong>{g.name}</strong><small className="subline mono">{g.external_id||g.id}</small></td><td>{providerById.get(g.provider_id||'')?.name||'—'}</td><td>{g.game_type}</td><td>{g.category||'—'}</td><td>{g.certified_rtp==null?'—':g.certified_rtp.toFixed(2)+'%'}</td><td>{g.volatility}</td><td>{g.max_multiplier==null?'—':'x'+g.max_multiplier.toLocaleString('tr-TR')}</td><td>{g.maintenance?<span className="badge review">maintenance</span>:g.enabled?<span className="badge active">enabled</span>:<span className="badge disabled">disabled</span>}</td><td>{fmt(g.provider_updated_at)}</td></tr>)}
    </tbody></table></div></section>
  </div>
}
