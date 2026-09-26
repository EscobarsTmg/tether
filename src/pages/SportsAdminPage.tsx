import { FormEvent, useMemo, useState } from 'react'
import { ingestSportsPayload, overrideSportsFixture, useSportsData } from '../lib/sportsData'

const sample=JSON.stringify({
  provider:{key:'demo-feed',name:'Demo Sports Feed',mode:'manual'},
  leagues:[{externalId:'league-1',name:'Demo League',sport:'football',country:'TR'}],
  teams:[{externalId:'team-a',name:'Alpha FC',sport:'football'},{externalId:'team-b',name:'Beta FC',sport:'football'}],
  fixtures:[{externalId:'fixture-1',sport:'football',leagueExternalId:'league-1',homeTeamExternalId:'team-a',awayTeamExternalId:'team-b',startsAt:new Date(Date.now()+3600000).toISOString(),status:'scheduled'}],
  events:[],triggerType:'manual'
},null,2)

export default function SportsAdminPage(){
  const{fixtures,leagueById,teamById,mappings,reload}=useSportsData()
  const[payload,setPayload]=useState(sample);const[result,setResult]=useState('');const[busy,setBusy]=useState(false)
  const[fixtureId,setFixtureId]=useState('');const[status,setStatus]=useState('live');const[home,setHome]=useState('0');const[away,setAway]=useState('0');const[minute,setMinute]=useState('')
  const selected=useMemo(()=>fixtures.find(x=>x.id===fixtureId),[fixtures,fixtureId])

  async function submitPayload(e:FormEvent){e.preventDefault();setBusy(true);setResult('');try{const parsed=JSON.parse(payload);const data=await ingestSportsPayload(parsed);setResult(JSON.stringify(data,null,2));await reload()}catch(err){setResult(err instanceof Error?err.message:String(err))}finally{setBusy(false)}}
  async function submitOverride(e:FormEvent){e.preventDefault();if(!fixtureId)return;setBusy(true);setResult('');try{const changes:Record<string,unknown>={status,home_score:Number(home),away_score:Number(away)};if(minute!=='')changes.minute=Number(minute);const data=await overrideSportsFixture(fixtureId,changes,'Admin sports console override');setResult(JSON.stringify(data,null,2));await reload()}catch(err){setResult(err instanceof Error?err.message:String(err))}finally{setBusy(false)}}

  return <div className="page"><div className="two-col">
    <section className="panel"><div className="panel-head"><div><h2>Normalized data ingest</h2><p>Paste normalized provider JSON or connect the automation adapter later.</p></div></div><form onSubmit={submitPayload}><textarea style={{width:'100%',minHeight:360}} value={payload} onChange={e=>setPayload(e.target.value)}/><div className="toolbar"><button className="primary-btn" disabled={busy}>{busy?'Processing...':'Ingest data'}</button></div></form></section>
    <section className="panel"><div className="panel-head"><div><h2>Fixture override</h2><p>Admin-only correction with audit trail.</p></div></div><form onSubmit={submitOverride}>
      <label>Fixture<select value={fixtureId} onChange={e=>{setFixtureId(e.target.value);const f=fixtures.find(x=>x.id===e.target.value);if(f){setStatus(f.status);setHome(String(f.home_score));setAway(String(f.away_score));setMinute(f.minute==null?'':String(f.minute))}}}><option value="">Select fixture</option>{fixtures.slice(0,200).map(f=><option value={f.id} key={f.id}>{teamById.get(f.home_team_id||'')?.name||'Home'} - {teamById.get(f.away_team_id||'')?.name||'Away'} · {leagueById.get(f.league_id||'')?.name||'League'}</option>)}</select></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option>scheduled</option><option>live</option><option>paused</option><option>finished</option><option>postponed</option><option>cancelled</option></select></label>
      <label>Home score<input type="number" min="0" value={home} onChange={e=>setHome(e.target.value)}/></label>
      <label>Away score<input type="number" min="0" value={away} onChange={e=>setAway(e.target.value)}/></label>
      <label>Minute<input type="number" min="0" max="200" value={minute} onChange={e=>setMinute(e.target.value)}/></label>
      {selected&&<p>Selected: {selected.external_id||selected.id}</p>}<button className="primary-btn" disabled={busy||!fixtureId}>Apply override</button>
    </form><hr/><h3>Provider mappings</h3><p>{mappings.length} mapping records visible to this admin account.</p>{result&&<pre style={{whiteSpace:'pre-wrap',maxHeight:260,overflow:'auto'}}>{result}</pre>}</section>
  </div></div>
}
