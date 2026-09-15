import { FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Building2, ChevronRight, CircleDollarSign, Clock3, DatabaseZap, FileClock, FileText, Gauge, History, Link2, ListChecks, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, WalletCards, Webhook, X, Plus, Download, Landmark, CircleAlert, CheckCircle2, PauseCircle, ArrowDownToLine, ArrowUpFromLine, Copy, Boxes, Filter, UserRoundCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { bankCatalog, bankByProvider } from '../lib/bankCatalog'
import { useOpsData } from '../lib/opsData'
import { cls, money, dt, Badge, PageState, Empty, Stat, copyText, SummaryStrip, TransactionTable } from '../components/ui/OperationsUi'

export default function AuditLogPage(){const d=useOpsData();return <div className="ops-page"><PageState loading={d.loading} error={d.error} reload={d.reload}/>{!d.loading&&!d.error&&<section className="ops-panel"><div className="ops-panelhead"><div><h2>Audit log</h2><p>Administrative and operational activity</p></div></div>{d.auditLogs.length?<div className="ops-tablewrap"><table className="ops-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Detail</th><th>Severity</th></tr></thead><tbody>{d.auditLogs.map(a=><tr key={a.id}><td>{dt(a.created_at)}</td><td>{a.actor_label||'system'}</td><td>{a.action}</td><td>{a.resource_type||'—'}</td><td>{a.detail||'—'}</td><td><Badge value={a.severity}/></td></tr>)}</tbody></table></div>:<Empty title="No audit events" detail="Security and operations events will appear here."/>}</section>}</div>}
