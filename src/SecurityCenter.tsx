import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Copy, KeyRound, Laptop, Mail, Network, RefreshCw, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react'
import { supabase } from './lib/supabase'

type AppSession={id:string;user_id:string;device_label:string|null;user_agent:string|null;ip_network:string|null;risk_score:number;risk_reasons:string[];created_at:string;last_seen_at:string;revoked_at:string|null}
type SecurityEvent={id:string;event_type:string;severity:string;ip_network:string|null;metadata:Record<string,unknown>;created_at:string}
type TrustedDevice={id:string;label:string|null;first_seen_at:string;last_seen_at:string;revoked_at:string|null}
type Allowlist={id:string;cidr:string;label:string|null;enabled:boolean;created_at:string}

function deviceId(){
  const key='fintech_panel_device_id'
  let id=localStorage.getItem(key)
  if(!id){id=crypto.randomUUID();localStorage.setItem(key,id)}
  return id
}
function deviceLabel(){const ua=navigator.userAgent;const mobile=/Android|iPhone|iPad/i.test(ua);return `${mobile?'Mobile':'Desktop'} · ${navigator.platform||'browser'}`}
function dt(v:string|null){return v?new Date(v).toLocaleString('tr-TR'):'—'}
function riskClass(score:number){return score>=60?'risk-critical':score>=35?'risk-high':score>=15?'risk-warn':'risk-low'}
function severityClass(v:string){return `security-severity ${v}`}

export default function SecurityCenter(){
  const[sessions,setSessions]=useState<AppSession[]>([]);const[events,setEvents]=useState<SecurityEvent[]>([]);const[devices,setDevices]=useState<TrustedDevice[]>([]);const[allowlist,setAllowlist]=useState<Allowlist[]>([]);const[loading,setLoading]=useState(true);const[msg,setMsg]=useState('');const[email,setEmail]=useState('');const[cidr,setCidr]=useState('');const[label,setLabel]=useState('')

  const load=useCallback(async()=>{if(!supabase)return;setLoading(true);const [s,e,d,a]=await Promise.all([supabase.from('app_sessions').select('*').order('last_seen_at',{ascending:false}).limit(100),supabase.from('security_events').select('*').order('created_at',{ascending:false}).limit(150),supabase.from('trusted_devices').select('*').order('last_seen_at',{ascending:false}).limit(100),supabase.from('ip_allowlist').select('*').order('created_at',{ascending:false}).limit(100)]);setSessions((s.data||[]) as AppSession[]);setEvents((e.data||[]) as SecurityEvent[]);setDevices((d.data||[]) as TrustedDevice[]);setAllowlist((a.data||[]) as Allowlist[]);setLoading(false)},[])

  useEffect(()=>{void load()},[load])
  useEffect(()=>{if(!supabase)return;const client=supabase;void client.functions.invoke('security-event',{body:{event_type:'security_center_opened',device_id:deviceId(),device_label:deviceLabel(),metadata:{path:location.pathname}}}).then(()=>load());const timer=window.setInterval(()=>{void client.functions.invoke('security-event',{body:{event_type:'heartbeat',device_id:deviceId(),device_label:deviceLabel()}})},5*60*1000);return()=>window.clearInterval(timer)},[load])

  const active=useMemo(()=>sessions.filter(s=>!s.revoked_at),[sessions]);const elevated=useMemo(()=>sessions.filter(s=>s.risk_score>=35&&!s.revoked_at),[sessions]);

  async function signOutOthers(){if(!supabase)return;setMsg('');const {error}=await supabase.auth.signOut({scope:'others'});setMsg(error?.message||'Other Supabase sessions were signed out.');void supabase.functions.invoke('security-event',{body:{event_type:'sign_out_others',device_id:deviceId(),device_label:deviceLabel()}})}
  async function sendMobileLink(e:FormEvent){e.preventDefault();if(!supabase)return;setMsg('');const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/security-sessions`}});setMsg(error?.message||'Secure sign-in link sent to the email address. Open it on your phone to sign in.');if(!error)setEmail('')}
  async function addAllowlist(e:FormEvent){e.preventDefault();if(!supabase)return;setMsg('');const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from('ip_allowlist').insert({cidr,label:label||null,created_by:user.id});setMsg(error?.message||'Network allowlist entry added.');if(!error){setCidr('');setLabel('');void load()}}
  async function toggleAllowlist(row:Allowlist){if(!supabase)return;const {error}=await supabase.from('ip_allowlist').update({enabled:!row.enabled}).eq('id',row.id);setMsg(error?.message||`Network rule ${row.enabled?'disabled':'enabled'}.`);if(!error)void load()}

  return <div className="security-page"><header className="security-header"><Link to="/"><ArrowLeft size={17}/> Back to operations</Link><div><ShieldCheck size={22}/><span><strong>Security Center</strong><small>First-party sessions, devices, audit events and network controls</small></span></div><button onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></header>
  <main className="security-main">{msg&&<div className="security-message">{msg}</div>}
    <section className="security-hero"><div><span>SESSION SECURITY</span><h1>Persistent access without storing reusable banking secrets.</h1><p>The panel keeps its own Supabase session alive with refresh-token rotation. Bank authentication remains on the bank or licensed provider domain.</p></div><ShieldCheck size={56}/></section>
    <div className="security-stats"><div><span>Active sessions</span><strong>{active.length}</strong><small>Application sessions</small></div><div><span>Elevated risk</span><strong>{elevated.length}</strong><small>Risk score ≥ 35</small></div><div><span>Trusted devices</span><strong>{devices.filter(d=>!d.revoked_at).length}</strong><small>Hashed device identifiers</small></div><div><span>Security events</span><strong>{events.length}</strong><small>Recent events loaded</small></div></div>

    <div className="security-grid"><section className="security-panel"><div className="security-panelhead"><div><h2>Application sessions</h2><p>No raw JWT, password, OTP or bank cookie is stored.</p></div><button onClick={()=>void signOutOthers()}><KeyRound size={14}/> Sign out other sessions</button></div>{loading?<div className="security-empty">Loading…</div>:sessions.length?<div className="security-tablewrap"><table><thead><tr><th>Device</th><th>Network</th><th>Risk</th><th>Created</th><th>Last seen</th></tr></thead><tbody>{sessions.map(s=><tr key={s.id}><td><span className="device-cell">{/Android|iPhone|iPad/i.test(s.user_agent||'')?<Smartphone size={15}/>:<Laptop size={15}/>}<span><strong>{s.device_label||'Unknown device'}</strong><small>{(s.user_agent||'').slice(0,70)||'No user-agent'}</small></span></span></td><td>{s.ip_network||'—'}</td><td><span className={`risk-chip ${riskClass(s.risk_score)}`}>{s.risk_score}/100</span><small>{(s.risk_reasons||[]).join(', ')||'normal'}</small></td><td>{dt(s.created_at)}</td><td>{dt(s.last_seen_at)}</td></tr>)}</tbody></table></div>:<div className="security-empty">No session records yet. Deploy the security-event function and refresh this page.</div>}</section>

    <section className="security-panel"><div className="security-panelhead"><div><h2>Mobile sign-in</h2><p>Send a secure first-party magic link to your own email.</p></div><Smartphone size={18}/></div><form className="security-form" onSubmit={sendMobileLink}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required/></label><button><Mail size={14}/> Send phone sign-in link</button></form><div className="security-info"><CheckCircle2 size={16}/><span>The phone opens the panel after Supabase verifies the link. No bank password or banking session is transferred between devices.</span></div></section></div>

    <div className="security-grid"><section className="security-panel"><div className="security-panelhead"><div><h2>Network allowlist</h2><p>Use CIDR rules to restrict access. This is for enforcing IP policy, not bypassing it.</p></div><Network size={18}/></div><form className="allowlist-form" onSubmit={addAllowlist}><input value={cidr} onChange={e=>setCidr(e.target.value)} placeholder="203.0.113.0/24" required/><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Office network"/><button>Add rule</button></form>{allowlist.length?<div className="allowlist-list">{allowlist.map(a=><div key={a.id}><span><strong>{a.cidr}</strong><small>{a.label||'No label'} · {dt(a.created_at)}</small></span><button className={a.enabled?'enabled':'disabled'} onClick={()=>void toggleAllowlist(a)}>{a.enabled?'Enabled':'Disabled'}</button></div>)}</div>:<div className="security-empty compact">No network rules configured.</div>}</section>

    <section className="security-panel"><div className="security-panelhead"><div><h2>Security event log</h2><p>Sanitized authentication and device telemetry.</p></div><TriangleAlert size={18}/></div>{events.length?<div className="event-list">{events.slice(0,30).map(e=><div key={e.id}><span className={severityClass(e.severity)}>{e.severity}</span><span className="event-grow"><strong>{e.event_type}</strong><small>{e.ip_network||'No network'} · {dt(e.created_at)}</small></span><button onClick={()=>navigator.clipboard?.writeText(e.id)} title="Copy event id"><Copy size={13}/></button></div>)}</div>:<div className="security-empty compact">No security events yet.</div>}</section></div>
  </main></div>
}
