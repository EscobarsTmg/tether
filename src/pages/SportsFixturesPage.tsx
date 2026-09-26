import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSportsData } from '../lib/sportsData'

const fmt=(value:string)=>new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))
export default function SportsFixturesPage(){
  const{fixtures,leagueById,teamById,providerById,loading,error}=useSportsData()
  const[q,setQ]=useState('');const[status,setStatus]=useState('')
  const rows=useMemo(()=>fixtures.filter(x=>{
    const searchable=[leagueById.get(x.league_id||'')?.name,teamById.get(x.home_team_id||'')?.name,teamById.get(x.away_team_id||'')?.name,x.external_id,x.venue].join(' ').toLowerCase()
    return(!q||searchable.includes(q.toLowerCase()))&&(!status||x.status===status)
  }),[fixtures,leagueById,teamById,q,status])
  return <div className="page"><section className="panel">
    <div className="panel-head"><div><h2>Sports fixtures</h2><p>Normalized fixtures from all connected providers.</p></div><div className="toolbar"><label className="search-box"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search team, league, venue..."/></label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>scheduled</option><option>live</option><option>paused</option><option>finished</option><option>postponed</option><option>cancelled</option></select></div></div>
    {error&&<p>{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Start</th><th>Sport</th><th>League</th><th>Home</th><th>Away</th><th>Score</th><th>Status</th><th>Provider</th></tr></thead><tbody>
      {rows.map(x=><tr key={x.id}><td>{fmt(x.starts_at)}</td><td>{x.sport}</td><td>{leagueById.get(x.league_id||'')?.name||'—'}</td><td><strong>{teamById.get(x.home_team_id||'')?.name||'—'}</strong></td><td><strong>{teamById.get(x.away_team_id||'')?.name||'—'}</strong></td><td>{x.home_score} - {x.away_score}</td><td><span className={'badge '+x.status}>{x.status}</span></td><td>{providerById.get(x.provider_id||'')?.name||'—'}</td></tr>)}
    </tbody></table></div><div className="table-foot">{loading?'Loading...':rows.length+' fixtures'}</div>
  </section></div>
}
