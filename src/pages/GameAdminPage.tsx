import {FormEvent,useMemo,useState} from 'react'
import {ingestGameCatalog,updateGameAdmin,useGameCatalog} from '../lib/gameCatalog'

const sample=JSON.stringify({
 provider:{key:'demo-games',name:'Demo Games Provider',type:'manual'},
 games:[
  {externalId:'slot-001',name:'Demo Slot',type:'slot',category:'slots',certifiedRtp:96.2,volatility:'medium',maxMultiplier:5000},
  {externalId:'live-001',name:'Demo Roulette Live',type:'live_casino',category:'roulette',certifiedRtp:97.3,volatility:'unknown'}
 ],
 triggerType:'manual'
},null,2)

export default function GameAdminPage(){
 const{games,providerById,mappings,reload}=useGameCatalog()
 const[payload,setPayload]=useState(sample);const[result,setResult]=useState('');const[busy,setBusy]=useState(false)
 const[gameId,setGameId]=useState('');const[enabled,setEnabled]=useState(true);const[maintenance,setMaintenance]=useState(false);const[featured,setFeatured]=useState(false);const[category,setCategory]=useState('');const[sortOrder,setSortOrder]=useState('0')
 const selected=useMemo(()=>games.find(g=>g.id===gameId),[games,gameId])

 async function sync(e:FormEvent){e.preventDefault();setBusy(true);setResult('');try{const data=await ingestGameCatalog(JSON.parse(payload));setResult(JSON.stringify(data,null,2));await reload()}catch(err){setResult(err instanceof Error?err.message:String(err))}finally{setBusy(false)}}
 async function save(e:FormEvent){e.preventDefault();if(!gameId)return;setBusy(true);setResult('');try{const data=await updateGameAdmin(gameId,{enabled,maintenance,featured,category:category||null,sort_order:Number(sortOrder)||0});setResult(JSON.stringify(data,null,2));await reload()}catch(err){setResult(err instanceof Error?err.message:String(err))}finally{setBusy(false)}}

 return <div className="page"><div className="stats-grid compact-stats">
  <div className="stat-card"><span>Catalog games</span><strong>{games.length}</strong><small>all provider records</small></div>
  <div className="stat-card"><span>Mappings</span><strong>{mappings.length}</strong><small>provider → internal</small></div>
  <div className="stat-card"><span>Enabled</span><strong>{games.filter(x=>x.enabled).length}</strong><small>visible catalog records</small></div>
  <div className="stat-card"><span>Maintenance</span><strong>{games.filter(x=>x.maintenance).length}</strong><small>temporarily hidden</small></div>
 </div><div className="two-col">
  <section className="panel"><div className="panel-head"><div><h2>Catalog ingest</h2><p>Provider catalog JSON is normalized and upserted by provider + external ID.</p></div></div><form onSubmit={sync}><textarea style={{width:'100%',minHeight:360}} value={payload} onChange={e=>setPayload(e.target.value)}/><button className="primary-btn" disabled={busy}>{busy?'Processing...':'Ingest catalog'}</button></form></section>
  <section className="panel"><div className="panel-head"><div><h2>Game presentation controls</h2><p>Controls visibility and catalog presentation only. Provider-certified RTP and game outcomes are not editable here.</p></div></div><form onSubmit={save}>
   <label>Game<select value={gameId} onChange={e=>{setGameId(e.target.value);const g=games.find(x=>x.id===e.target.value);if(g){setEnabled(g.enabled);setMaintenance(g.maintenance);setFeatured(g.featured);setCategory(g.category||'');setSortOrder(String(g.sort_order))}}}><option value="">Select game</option>{games.slice(0,5000).map(g=><option value={g.id} key={g.id}>{g.name} · {providerById.get(g.provider_id||'')?.name||'Provider'}</option>)}</select></label>
   <label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enabled</label>
   <label><input type="checkbox" checked={maintenance} onChange={e=>setMaintenance(e.target.checked)}/> Maintenance</label>
   <label><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/> Featured</label>
   <label>Category<input value={category} onChange={e=>setCategory(e.target.value)}/></label>
   <label>Sort order<input type="number" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}/></label>
   {selected&&<div><p><strong>Provider metadata</strong></p><p>RTP: {selected.certified_rtp==null?'—':selected.certified_rtp.toFixed(2)+'%'} · Volatility: {selected.volatility} · Max: {selected.max_multiplier==null?'—':'x'+selected.max_multiplier}</p></div>}
   <button className="primary-btn" disabled={busy||!gameId}>Save catalog settings</button>
  </form>{result&&<pre style={{whiteSpace:'pre-wrap',maxHeight:260,overflow:'auto'}}>{result}</pre>}</section>
 </div></div>
}
