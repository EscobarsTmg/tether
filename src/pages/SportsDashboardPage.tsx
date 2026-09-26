import { Activity, Database, Radio, RefreshCw } from 'lucide-react'
import { useSportsData } from '../lib/sportsData'

const fmt=(value:string)=>new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))
export default function SportsDashboardPage(){
  const{providers,fixtures,syncRuns,leagueById,teamById,loading,error,reload}=useSportsData()
  const live=fixtures.filter(x=>x.status==='live')
  const today=new Date();const end=new Date(today);end.setHours(23,59,59,999)
  const start=new Date(today);start.setHours(0,0,0,0)
  const todayFixtures=fixtures.filter(x=>{const d=new Date(x.starts_at);return d>=start&&d<=end})
  const failed=syncRuns.filter(x=>x.status==='failed').length
  return <div className="page">
    <div className="hero-strip"><div><span className="hero-kicker">SPORTS DATA CONTROL</span><h2>Fixture and live-data overview</h2><p>Provider data is normalized into internal leagues, teams and fixtures before reaching the UI.</p></div><button className="secondary-btn" onClick={()=>void reload()}><RefreshCw size={15}/> Refresh</button></div>
    {error&&<section className="panel"><strong>Sports data error</strong><p>{error}</p></section>}
    <div className="stats-grid">
      <div className="stat-card"><span>Active providers</span><strong>{providers.filter(x=>x.active).length}</strong><small><Database size={13}/> connected data sources</small></div>
      <div className="stat-card"><span>Fixtures today</span><strong>{todayFixtures.length}</strong><small>scheduled + live + finished</small></div>
      <div className="stat-card"><span>Live fixtures</span><strong>{live.length}</strong><small><Radio size={13}/> realtime enabled</small></div>
      <div className="stat-card"><span>Failed syncs</span><strong>{failed}</strong><small><Activity size={13}/> last 100 runs</small></div>
    </div>
    <section className="panel"><div className="panel-head"><div><h2>Live and upcoming</h2><p>{loading?'Loading sports data...':'Latest normalized fixtures'}</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Start</th><th>League</th><th>Fixture</th><th>Score</th><th>Status</th><th>Minute</th></tr></thead><tbody>
        {fixtures.filter(x=>x.status==='live'||new Date(x.starts_at)>=new Date()).slice(0,15).map(x=><tr key={x.id}><td>{fmt(x.starts_at)}</td><td>{leagueById.get(x.league_id||'')?.name||'—'}</td><td><strong>{teamById.get(x.home_team_id||'')?.name||'Home'} - {teamById.get(x.away_team_id||'')?.name||'Away'}</strong></td><td>{x.home_score} - {x.away_score}</td><td><span className={'badge '+x.status}>{x.status}</span></td><td>{x.minute==null?'—':x.minute+"'"}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>
}
