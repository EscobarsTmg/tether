import { FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Building2, ChevronRight, CircleDollarSign, Clock3, DatabaseZap, FileClock, FileText, Gauge, History, Link2, ListChecks, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, WalletCards, Webhook, X, Plus, Download, Landmark, CircleAlert, CheckCircle2, PauseCircle, ArrowDownToLine, ArrowUpFromLine, Copy, Boxes, Filter, UserRoundCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { bankCatalog, bankByProvider } from '../lib/bankCatalog'
import { useOpsData } from '../lib/opsData'
import { cls, money, dt, Badge, PageState, Empty, Stat, copyText, SummaryStrip, TransactionTable } from '../components/ui/OperationsUi'

export default function UserGroupsPage(){return <div className="ops-page"><section className="ops-panel"><div className="ops-panelhead"><div><h2>User groups</h2><p>Role grouping is ready for workspace-specific RBAC rules.</p></div></div><div className="ops-reportgrid"><div><Users/><strong>Administrators</strong><span>Full operations access</span></div><div><ShieldCheck/><strong>Reviewers</strong><span>Review and reconciliation access</span></div><div><FileClock/><strong>Viewers</strong><span>Read-only visibility</span></div></div></section></div>}
