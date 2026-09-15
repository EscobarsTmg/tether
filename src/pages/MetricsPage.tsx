import { FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Building2, ChevronRight, CircleDollarSign, Clock3, DatabaseZap, FileClock, FileText, Gauge, History, Link2, ListChecks, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, WalletCards, Webhook, X, Plus, Download, Landmark, CircleAlert, CheckCircle2, PauseCircle, ArrowDownToLine, ArrowUpFromLine, Copy, Boxes, Filter, UserRoundCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { bankCatalog, bankByProvider } from '../lib/bankCatalog'
import { useOpsData } from '../lib/opsData'
import { cls, money, dt, Badge, PageState, Empty, Stat, copyText, SummaryStrip, TransactionTable } from '../components/ui/OperationsUi'

export default function MetricsPage(){const d=useOpsData();const connected=d.connections.filter(c=>['connected','active'].includes(String(c.status).toLowerCase())).length;return <div className="ops-page"><PageState loading={d.loading} error={d.error} reload={d.reload}/>{!d.loading&&!d.error&&<div className="ops-stats metrics"><Stat label="Provider availability" value={d.connections.length?`${Math.round((connected/d.connections.length)*100)}%`:'—'} note={`${connected}/${d.connections.length} connected`} tone="good"/><Stat label="Account coverage" value={String(d.accounts.length)} note="Synchronized accounts"/><Stat label="Ledger depth" value={String(d.transactions.length)} note="Recent records loaded"/><Stat label="Audit events" value={String(d.auditLogs.length)} note="Recent security and ops events"/></div>}</div>}
