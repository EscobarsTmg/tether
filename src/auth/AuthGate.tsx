import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { ChevronRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import type { AuthError, Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Profile = { full_name: string | null; role: 'admin' | 'reviewer' | 'viewer' }
type AuthMode = 'signin' | 'setup'
type Toast = { id:number; text:string; kind:'error'|'ok' }

const leakedPasswordMessage='Bu şifre daha önce bir veri sızıntısında yer almış. Lütfen farklı bir şifre seçin.'
function authMessage(error:AuthError){
  const code=String((error as AuthError & {code?:string}).code||'').toLowerCase()
  const message=error.message.toLowerCase()
  if(code==='weak_password'||code==='leaked_password'||message.includes('weak_password')||message.includes('leaked_password')||message.includes('password has been pwned')||message.includes('password is known to be weak')) return leakedPasswordMessage
  return error.message
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [mode, setMode] = useState<AuthMode>('signin')
  const [fullName, setFullName] = useState('System Administrator')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [toasts,setToasts]=useState<Toast[]>([])
  const toast=(text:string,kind:'error'|'ok'='error')=>{const id=Date.now();setToasts(v=>[...v,{id,text,kind}]);setTimeout(()=>setToasts(v=>v.filter(x=>x.id!==id)),4500)}

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    client.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) { setProfile(null); return }
    supabase.from('profiles').select('full_name, role').eq('id', session.user.id).maybeSingle().then(({ data }) => setProfile(data as Profile | null))
  }, [session])

  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    const handler = (event: MouseEvent) => { const target = event.target as HTMLElement; if (target.closest('.sidebar-foot button')) void client.auth.signOut() }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [session])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true); setError(''); setMessage('')

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { const text=authMessage(signInError); setError(text); if(text===leakedPasswordMessage) toast(text) }
      setLoading(false); return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (signUpError) {
      const text=authMessage(signUpError); setError(text); if(text===leakedPasswordMessage) toast(text)
    } else if (!data.session) {
      setMessage('Yönetici hesabı oluşturuldu. E-posta doğrulaması açıksa e-postayı doğrulayıp giriş yapın.'); setMode('signin')
    } else setMessage('Yönetici hesabı oluşturuldu ve oturum açıldı.')
    setLoading(false)
  }

  function changeMode(next: AuthMode) { setMode(next); setError(''); setMessage('') }
  if (!ready) return <div className="boot-screen"><div className="boot-loader"/><span>Securing workspace…</span></div>
  if (!isSupabaseConfigured) return <>{children}</>
  if (session) return <div data-auth-role={profile?.role || 'viewer'} data-auth-user={profile?.full_name || session.user.email || ''}>{children}</div>
  const setup = mode === 'setup'

  return <div className="auth-page">
    <div className="auth-orb orb-one"/><div className="auth-orb orb-two"/>
    <section className="auth-showcase"><div className="auth-brand"><div className="brand-mark">F</div><div><strong>Fintech Panel</strong><span>Operations Console</span></div></div><div className="auth-message"><div className="eyebrow"><Sparkles size={14}/> Enterprise Control Layer</div><h1>Financial operations,<br/><span>without the noise.</span></h1><p>Monitor accounts, reconcile ledgers and review operational activity from a single protected workspace.</p><div className="auth-stats"><div><strong>24/7</strong><span>Visibility</span></div><div><strong>RLS</strong><span>Data isolation</span></div><div><strong>RBAC</strong><span>Role controls</span></div></div></div><div className="auth-secure"><ShieldCheck size={17}/><span>Supabase Auth · Row Level Security · Audited access</span></div></section>
    <section className="auth-form-side"><form className="auth-card" onSubmit={handleSubmit}><div className="auth-mode-switch"><button type="button" className={!setup ? 'active' : ''} onClick={() => changeMode('signin')}>Sign in</button><button type="button" className={setup ? 'active' : ''} onClick={() => changeMode('setup')}>First admin setup</button></div><div className="auth-icon">{setup ? <UserRound size={22}/> : <LockKeyhole size={22}/>}</div><div className="auth-title"><h2>{setup ? 'Create first administrator' : 'Welcome back'}</h2><p>{setup ? 'The first account created in this workspace is automatically assigned the admin role.' : 'Sign in to continue to the operations console.'}</p></div>{setup && <label>Administrator name<div className="auth-input"><UserRound size={17}/><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="System Administrator" autoComplete="name" required/></div></label>}<label>Email address<div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@company.com" autoComplete="email" required/></div></label><label>Password<div className="auth-input"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 12 characters recommended" autoComplete={setup ? 'new-password' : 'current-password'} minLength={8} required/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>{error && <div className="auth-error">{error}</div>}{message && <div className="auth-success">{message}</div>}<button className="auth-submit" disabled={loading}>{loading ? (setup ? 'Creating administrator…' : 'Signing in…') : (setup ? 'Create administrator' : 'Sign in securely')}<ChevronRight size={16}/></button><div className="auth-note">{setup ? 'Use an email address you control. Additional users default to Viewer.' : 'Authorized personnel only. Sign-in activity is recorded.'}</div></form></section>
    <div style={{position:'fixed',right:18,bottom:18,zIndex:200,display:'grid',gap:8}}>{toasts.map(t=><div key={t.id} style={{maxWidth:420,padding:'12px 14px',borderRadius:10,background:t.kind==='ok'?'#ecfdf5':'#fff1f2',border:`1px solid ${t.kind==='ok'?'#a7f3d0':'#fecdd3'}`,color:'#0f172a',fontSize:12,boxShadow:'0 12px 30px rgba(15,23,42,.12)'}}>{t.text}</div>)}</div>
  </div>
}
