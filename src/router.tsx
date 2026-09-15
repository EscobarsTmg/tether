import { Navigate, Route, Routes } from 'react-router-dom'
import OperationsLayout from './layouts/OperationsLayout'
import DashboardPage from './pages/DashboardPage'
import BankAccountsPage from './pages/BankAccountsPage'
import TransactionsPage from './pages/TransactionsPage'
import AccountMovementsPage from './pages/AccountMovementsPage'
import AccountHistoryPage from './pages/AccountHistoryPage'
import ReportsPage from './pages/ReportsPage'
import ReconciliationPage from './pages/ReconciliationPage'
import ConnectionStatusPage from './pages/ConnectionStatusPage'
import MetricsPage from './pages/MetricsPage'
import BankConnectionsPage from './pages/BankConnectionsPage'
import UsersPage from './pages/UsersPage'
import UserGroupsPage from './pages/UserGroupsPage'
import AuditLogPage from './pages/AuditLogPage'
import CallbacksPage from './pages/CallbacksPage'
import SettingsPage from './pages/SettingsPage'
import SecurityCenterPage from './pages/SecurityCenterPage'
import MultiAccountSandboxPage from './pages/MultiAccountSandboxPage'
import AutomationCenterPage from './pages/AutomationCenterPage'

export default function AppRouter(){return <Routes><Route element={<OperationsLayout/>}>
<Route path="/" element={<DashboardPage/>}/><Route path="/bank-accounts" element={<BankAccountsPage/>}/>
<Route path="/transactions" element={<TransactionsPage/>}/><Route path="/account-movements" element={<AccountMovementsPage/>}/>
<Route path="/account-history" element={<AccountHistoryPage/>}/><Route path="/reports" element={<ReportsPage/>}/>
<Route path="/reconciliation" element={<ReconciliationPage/>}/><Route path="/connection-status" element={<ConnectionStatusPage/>}/>
<Route path="/metrics" element={<MetricsPage/>}/><Route path="/bank-connections" element={<BankConnectionsPage/>}/>
<Route path="/users" element={<UsersPage/>}/><Route path="/user-groups" element={<UserGroupsPage/>}/>
<Route path="/audit-log" element={<AuditLogPage/>}/><Route path="/callbacks" element={<CallbacksPage/>}/>
<Route path="/settings" element={<SettingsPage/>}/><Route path="/security-sessions" element={<SecurityCenterPage/>}/>
<Route path="/sandbox/multi-account" element={<MultiAccountSandboxPage/>}/><Route path="/automation-center" element={<AutomationCenterPage/>}/>
<Route path="*" element={<Navigate to="/" replace/>}/>
</Route></Routes>}
