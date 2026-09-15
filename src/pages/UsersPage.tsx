import { FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Building2, ChevronRight, CircleDollarSign, Clock3, DatabaseZap, FileClock, FileText, Gauge, History, Link2, ListChecks, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, WalletCards, Webhook, X, Plus, Download, Landmark, CircleAlert, CheckCircle2, PauseCircle, ArrowDownToLine, ArrowUpFromLine, Copy, Boxes, Filter, UserRoundCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { bankCatalog, bankByProvider } from '../lib/bankCatalog'
import { useOpsData } from '../lib/opsData'
import { cls, money, dt, Badge, PageState, Empty, Stat, copyText, SummaryStrip, TransactionTable } from '../components/ui/OperationsUi'

export default function UsersPage(){const d=useOpsData();return <div className="ops-page"><PageState loading={d.loading} error={d.error} reload={d.reload}/>{!d.loading&&!d.error&&<section className="ops-panel"><div className="ops-panelhead"><div><h2>Users</h2><p>Workspace profiles and roles</p></div></div>{d.profiles.length?<div className="ops-tablewrap"><table className="ops-table"><thead><tr><th>Name</th><th>Role</th><th>Created</th><th>ID</th></tr></thead><tbody>{d.profiles.map(p=><tr key={p.id}><td><strong>{p.full_name||'Unnamed user'}</strong></td><td><Badge value={p.role}/></td><td>{dt(p.created_at)}</td><td className="mono">{p.id.slice(0,12)}…</td></tr>)}</tbody></table></div>:<Empty title="No user profiles" detail="Supabase profiles will appear here."/>}</section>}</div>}
