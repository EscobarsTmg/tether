import { FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Building2, ChevronRight, CircleDollarSign, Clock3, DatabaseZap, FileClock, FileText, Gauge, History, Link2, ListChecks, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, WalletCards, Webhook, X, Plus, Download, Landmark, CircleAlert, CheckCircle2, PauseCircle, ArrowDownToLine, ArrowUpFromLine, Copy, Boxes, Filter, UserRoundCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { bankCatalog, bankByProvider } from '../lib/bankCatalog'
import { useOpsData } from '../lib/opsData'
import { cls, money, dt, Badge, PageState, Empty, Stat, copyText, SummaryStrip, TransactionTable } from '../components/ui/OperationsUi'

export default function AccountHistoryPage(){const d=useOpsData();return <div className="ops-page"><PageState loading={d.loading} error={d.error} reload={d.reload}/>{!d.loading&&!d.error&&<section className="ops-panel"><div className="ops-panelhead"><div><h2>Account history</h2><p>Status and operational events</p></div></div>{d.history.length?<div className="ops-tablewrap"><table className="ops-table"><thead><tr><th>Time</th><th>Account</th><th>Event</th><th>Message</th><th>Status</th></tr></thead><tbody>{d.history.map(h=>{const a=d.accounts.find(x=>x.id===h.account_id);return <tr key={h.id}><td>{dt(h.created_at)}</td><td>{a?.account_name||'—'}<small>{a?.bank_name||''}</small></td><td>{h.event_type}</td><td>{h.event_message}</td><td><Badge value={h.status}/></td></tr>})}</tbody></table></div>:<Empty title="No account history" detail="Account lifecycle events will appear here."/>}</section>}</div>}
