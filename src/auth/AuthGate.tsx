import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { ChevronRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Profile = { full_name: string | null; role: 'admin' | 'reviewer' | 'viewer' }

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) { setProfile(null); return }
    supabase.from('profiles').select('full_name, role').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data as Profile | null))
  }, [session])

  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('.sidebar-foot button')) void client.auth.signOut()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [session])

  async function signIn(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  if (!ready) return <div className="boot-screen"><div className="boot-loader"/><span>Securing workspace…</span></div>
  if (!isSupabaseConfigured) return <>{children}</>
  if (session) return <div data-auth-role={profile?.role || 'viewer'} data-auth-user={profile?.full_name || session.user.email || ''}>{children}</div>

  return <div className="auth-page">
    <div className="auth-orb orb-one"/><div className="auth-orb orb-two"/>
    <section className="auth-showcase">
      <div className="auth-brand"><div className="brand-mark">F</div><div><strong>Fintech Panel</strong><span>Operations Console</span></div></div>
      <div className="auth-message">
        <div className="eyebrow"><Sparkles size={14}/> Enterprise Control Layer</div>
        <h1>Financial operations,<br/><span>without the noise.</span></h1>
        <p>Monitor accounts, reconcile ledgers and review operational activity from a single protected workspace.</p>
        <div className="auth-stats"><div><strong>24/7</strong><span>Visibility</span></div><div><strong>RLS</strong><span>Data isolation</span></div><div><strong>RBAC</strong><span>Role controls</span></div></div>
      </div>
      <div className="auth-secure"><ShieldCheck size={17}/><span>Supabase Auth · Row Level Security · Audited access</span></div>
    </section>
    <section className="auth-form-side">
      <form className="auth-card" onSubmit={signIn}>
        <div className="auth-icon"><LockKeyhole size={22}/></div>
        <div className="auth-title"><h2>Welcome back</h2><p>Sign in to continue to the operations console.</p></div>
        <label>Email address<div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@company.com" autoComplete="email" required/></div></label>
        <label>Password<div className="auth-input"><LockKeyhole size={17}/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password" required/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" disabled={loading}>{loading?'Signing in…':'Sign in securely'}<ChevronRight size={16}/></button>
        <div className="auth-note">Authorized personnel only. Sign-in activity is recorded.</div>
      </form>
    </section>
  </div>
}
