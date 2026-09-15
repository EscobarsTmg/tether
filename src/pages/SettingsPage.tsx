import { FormEvent, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Activity, BarChart3, Building2, ChevronRight, CircleDollarSign, Clock3, DatabaseZap, FileClock, FileText, Gauge, History, Link2, ListChecks, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, WalletCards, Webhook, X, Plus, Download, Landmark, CircleAlert, CheckCircle2, PauseCircle, ArrowDownToLine, ArrowUpFromLine, Copy, Boxes, Filter, UserRoundCog } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { bankCatalog, bankByProvider } from '../lib/bankCatalog'
import { useOpsData } from '../lib/opsData'
import { cls, money, dt, Badge, PageState, Empty, Stat, copyText, SummaryStrip, TransactionTable } from '../components/ui/OperationsUi'

export default function SettingsPage(){return <div className="ops-page"><section className="ops-panel"><div className="ops-panelhead"><div><h2>Integration policy</h2><p>Server-side provider configuration and workspace controls</p></div></div><div className="ops-settings"><div><ShieldCheck/><span><strong>Consent-based bank access</strong><small>Use official Open Banking/OAuth provider adapters and bank-hosted authorization.</small></span></div><div><DatabaseZap/><span><strong>Secrets stay server-side</strong><small>Client secrets, access tokens and signing keys belong in Supabase secrets, never browser code.</small></span></div><div><Webhook/><span><strong>Sanitized callbacks</strong><small>Store provider event metadata without collecting banking OTP or credential content.</small></span></div></div></section></div>}
