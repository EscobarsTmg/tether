import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity, BarChart3, Bell, ChevronDown, CircleDollarSign, FileText, Gauge, History,
  LayoutDashboard, Link2, ListChecks, LogOut, Menu, Settings, ShieldCheck, Users,
  WalletCards, Webhook, X, CheckCircle2, UserRoundCog, Bot, LockKeyhole,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem={path:string;label:string;icon:LucideIcon}
type NavGroup={label:string;items:NavItem[]}

export const navGroups:NavGroup[]=[
  {label:'OPERATIONS',items:[
    {label:'Dashboard',path:'/',icon:LayoutDashboard},
    {label:'Bank Accounts',path:'/bank-accounts',icon:WalletCards},
    {label:'Transactions',path:'/transactions',icon:CircleDollarSign},
    {label:'Account Movements',path:'/account-movements',icon:Activity},
    {label:'Account History',path:'/account-history',icon:History},
    {label:'Reports',path:'/reports',icon:FileText},
    {label:'Reconciliation',path:'/reconciliation',icon:ListChecks},
    {label:'Connection Status',path:'/connection-status',icon:Gauge},
    {label:'Metrics',path:'/metrics',icon:BarChart3},
  ]},
  {label:'ADMINISTRATION',items:[
    {label:'Bank Connections',path:'/bank-connections',icon:Link2},
    {label:'Users',path:'/users',icon:Users},
    {label:'User Groups',path:'/user-groups',icon:UserRoundCog},
    {label:'Audit Log',path:'/audit-log',icon:ShieldCheck},
    {label:'Callbacks',path:'/callbacks',icon:Webhook},
    {label:'Settings',path:'/settings',icon:Settings},
  ]},
  {label:'SYSTEM',items:[
    {label:'Automation Center',path:'/automation-center',icon:Bot},
    {label:'Security Center',path:'/security-sessions',icon:LockKeyhole},
  ]},
]

const allNav=navGroups.flatMap(group=>group.items)
const cls=(...values:(string|false|null|undefined)[])=>values.filter(Boolean).join(' ')

export default function OperationsLayout(){
  const location=useLocation()
  const[collapsed,setCollapsed]=useState(false)
  const[notices,setNotices]=useState(false)
  const current=allNav.find(item=>item.path===location.pathname)
  const title=current?.label??'Fintech Panel'
  const authRoot=document.querySelector('[data-auth-role]') as HTMLElement|null
  const role=authRoot?.dataset.authRole||'viewer'
  const user=authRoot?.dataset.authUser||'Administrator'

  return <div className={cls('ops-shell',collapsed&&'sidebar-collapsed')}>
    <aside className="ops-sidebar">
      <div className="ops-brand"><div className="ops-brandmark">F</div><div className="ops-brandtext"><strong>Fintech Panel</strong><span>Operations Console</span></div><button className="ops-collapse" onClick={()=>setCollapsed(value=>!value)}><Menu size={17}/></button></div>
      <nav>{navGroups.map(group=><div className="ops-navgroup" key={group.label}><span className="ops-navlabel">{group.label}</span>{group.items.map(({label,path,icon:Icon})=><NavLink key={path} to={path} end={path==='/' } className={({isActive})=>cls('ops-navlink',isActive&&'active')} title={label}><Icon size={17}/><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="ops-sidefoot"><div className="ops-live"><span/>Live workspace</div><button><LogOut size={16}/><span>Sign out</span></button></div>
    </aside>
    <main className="ops-main">
      <header className="ops-topbar"><div><p>Administration / {role}</p><h1>{title}</h1></div><div className="ops-topactions"><div className="ops-livepill"><span/> Live</div><button className="ops-iconbtn" onClick={()=>setNotices(value=>!value)}><Bell size={17}/></button><div className="ops-user"><div>{user.slice(0,2).toUpperCase()}</div><span><strong>{user}</strong><small>{role}</small></span><ChevronDown size={14}/></div></div></header>
      {notices&&<div className="ops-notices"><div><strong>Operations center</strong><button onClick={()=>setNotices(false)}><X size={15}/></button></div><p><CheckCircle2 size={15}/> Live data is sourced from Supabase tables and authorized provider adapters.</p><p><ShieldCheck size={15}/> Bank passwords, PINs, OTPs and browser-session cookies are not collected by this console.</p></div>}
      <Outlet/>
    </main>
  </div>
}
