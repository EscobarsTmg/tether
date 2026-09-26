import { Activity, Database, Radio, RefreshCw, Trophy, Link2Off } from 'lucide-react'
import { useSportsData } from '../lib/sportsData'

const fmt=(value:string)=>new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))
export default function SportsDashboardPage(){
  const{providers,sports,fixtures,syncRuns,unmapped,leagueById,teamById,loading,error,reload}=useSportsData()
  const live=fixtures.filter(x=>x.status==='live')
  const today=new Date();const end=new Date(today);end.setHours(23,59,59,999)
  const start=new Date(today);start.setHours(0,0,0,0)
  const todayFixtures=fixtures.filter(x=>{const d=new Date(x.starts_at);return d>=start&&d<=end})
  const failed=syncRuns.filter(x=>x.status==='failed').length
  const openUnmapped=unmapped.filter(x=>x.status==='open').length
  return <div className="page">
    <div className="hero-strip"><div><span className="hero-kicker">SPORTS DATA CONTROL</span><h2>Automatic sports catalog</h2><p>Every sport, league, team and fixture returned by a connected provider is discovered and normalized automatically.</p></div><button className="secondary-btn" onClick={()=>void reload()}><RefreshCw size={15}/> Refresh</button></div>
    {error&&<section className="panel"><strong>Sports data error</strong><p>{error}</p></section>}
    <div className="stats-grid">
      <div className="stat-card"><span>Discovered sports</span><strong>{sports.length}</strong><small><Trophy size={13}/> automatic catalog</small></div>
      <div className="stat-card"><span>Active providers</span><strong>{providers.filter(x=>x.active).length}</strong><small><Database size={13}/> connected sources</small></div>
      <div className="stat-card"><span>Fixtures today</span><strong>{todayFixtures.length}</strong><small>{fixtures.length} loaded fixtures</small></div>
      <div className="stat-card"><span>Live fixtures</span><strong>{live.length}</strong><small><Radio size={13}/> realtime enabled</small></div>
      <div className="stat-card"><span>Unmapped</span><strong>{openUnmapped}</strong><small><Link2Off size={13}/> requires review</small></div>
      <div className="stat-card"><span>Failed syncs</span><strong>{failed}</strong><small><Activity size={13}/> last 200 runs</small></div>
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Live and upcoming</h2><p>{loading?'Loading sports data...':'Latest normalized fixtures'}</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Start</th><th>Sport</th><th>League</th><th>Fixture</th><th>Score</th><th>Status</th><th>Minute</th></tr></thead><tbody>
        {fixtures.filter(x=>x.status==='live'||new Date(x.starts_at)>=new Date()).slice(0,20).map(x=><tr key={x.id}><td>{fmt(x.starts_at)}</td><td>{x.sport}</td><td>{leagueById.get(x.league_id||'')?.name||'—'}</td><td><strong>{teamById.get(x.home_team_id||'')?.name||'Home'} - {teamById.get(x.away_team_id||'')?.name||'Away'}</strong></td><td>{x.home_score} - {x.away_score}</td><td><span className={'badge '+x.status}>{x.status}</span></td><td>{x.minute==null?'—':x.minute+"'"}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>
}
