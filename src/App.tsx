import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Activity, Banknote, BarChart3, ChevronRight, CircleDollarSign, FileClock, LayoutDashboard, ListChecks, LogOut, Settings, ShieldCheck, Users, WalletCards } from 'lucide-react'
import { accounts, history, transactions } from './data/mock'

const nav = [
  ['Dashboard', '/', LayoutDashboard],
  ['Bank Accounts', '/bank-accounts', WalletCards],
  ['Transactions', '/transactions', CircleDollarSign],
  ['Account Movements', '/account-movements', Activity],
  ['Account History', '/account-history', FileClock],
  ['Reports', '/reports', BarChart3],
  ['Reconciliation', '/reconciliation', ListChecks],
  ['Users', '/users', Users],
  ['Audit Log', '/audit-log', ShieldCheck],
  ['Settings', '/settings', Settings],
] as const

function Badge({ value }: { value: string }) {
  return <span className={`badge ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const title = nav.find((x) => x[1] === location.pathname)?.[0] ?? 'Fintech Panel'
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">F</div><div><strong>Fintech Panel</strong><span>Operations Console</span></div></div>
        <nav>{nav.map(([label, href, Icon]) => <NavLink key={href} to={href} end={href === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-foot"><button><LogOut size={17}/> Sign out</button></div>
      </aside>
      <main className="content">
        <header className="topbar"><div><p>Administration</p><h1>{title}</h1></div><div className="env-pill">SANDBOX</div></header>
        {children}
      </main>
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
}

function Dashboard() {
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  return <div className="page"><div className="stats-grid"><Stat label="Total balance" value={`₺${total.toLocaleString('tr-TR', {minimumFractionDigits:2})}`} note="Across 3 sandbox accounts"/><Stat label="Connected accounts" value="3" note="2 active, 1 suspended"/><Stat label="Transactions today" value="18" note="Sandbox activity"/><Stat label="Pending review" value="1" note="Requires operator review"/></div><section className="panel"><div className="panel-head"><div><h2>Recent transactions</h2><p>Latest sandbox account activity</p></div><NavLink to="/transactions" className="text-link">View all <ChevronRight size={16}/></NavLink></div><TransactionTable compact /></section></div>
}

function Accounts() {
  return <div className="page"><section className="panel"><div className="panel-head"><div><h2>Bank accounts</h2><p>Connected accounts and operational state</p></div><button className="primary-btn">Add sandbox account</button></div><div className="table-wrap"><table><thead><tr><th>Bank</th><th>Account name</th><th>IBAN</th><th>Balance</th><th>Deposits</th><th>Withdrawals</th><th>Status</th></tr></thead><tbody>{accounts.map(a => <tr key={a.id}><td><strong>{a.bank}</strong></td><td>{a.name}</td><td className="mono">{a.iban}</td><td className="amount">₺{a.balance.toLocaleString('tr-TR',{minimumFractionDigits:2})}</td><td>{a.deposits ? <Badge value="Enabled"/> : <Badge value="Disabled"/>}</td><td>{a.withdrawals ? <Badge value="Enabled"/> : <Badge value="Disabled"/>}</td><td><Badge value={a.status}/></td></tr>)}</tbody></table></div></section></div>
}

function TransactionTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? transactions.slice(0, 3) : transactions
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Transfer</th><th>Counterparty</th><th>Account</th><th>Bank</th><th>Amount</th><th>Balance after</th><th>Status</th></tr></thead><tbody>{rows.map(t => <tr key={t.id}><td>{t.date}</td><td>{t.type}</td><td>{t.method}</td><td><div>{t.counterparty}</div><small className="mono">{t.iban}</small></td><td>{t.account}</td><td>{t.bank}</td><td className={t.amount < 0 ? 'amount negative' : 'amount positive'}>{t.amount < 0 ? '-' : '+'}₺{Math.abs(t.amount).toLocaleString('tr-TR')}</td><td className="amount">₺{t.balanceAfter.toLocaleString('tr-TR',{minimumFractionDigits:2})}</td><td><Badge value={t.status}/></td></tr>)}</tbody></table></div>
}

function Transactions() { return <div className="page"><section className="panel"><div className="panel-head"><div><h2>Transactions</h2><p>Sandbox transaction ledger</p></div><div className="toolbar"><input placeholder="Search transaction..."/><button>Filter</button></div></div><TransactionTable/></section></div> }

function History() { return <div className="page"><section className="panel"><div className="panel-head"><div><h2>Account history</h2><p>Operational state changes and system events</p></div></div><div className="timeline">{history.map((h,i)=><div className="timeline-item" key={i}><div className="dot"/><div><div className="timeline-top"><strong>{h.bank} · {h.account}</strong><Badge value={h.status}/></div><p>{h.event}</p><small>{h.time}</small></div></div>)}</div></section></div> }

function Placeholder({ name }: { name: string }) { return <div className="page"><section className="panel empty"><Banknote size={36}/><h2>{name}</h2><p>This module is scaffolded and ready for Supabase-backed data.</p></section></div> }

export default function App() {
  return <Shell><Routes><Route path="/" element={<Dashboard/>}/><Route path="/bank-accounts" element={<Accounts/>}/><Route path="/transactions" element={<Transactions/>}/><Route path="/account-history" element={<History/>}/><Route path="/account-movements" element={<Placeholder name="Account Movements"/>}/><Route path="/reports" element={<Placeholder name="Reports"/>}/><Route path="/reconciliation" element={<Placeholder name="Reconciliation"/>}/><Route path="/users" element={<Placeholder name="Users"/>}/><Route path="/audit-log" element={<Placeholder name="Audit Log"/>}/><Route path="/settings" element={<Placeholder name="Settings"/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell>
}
