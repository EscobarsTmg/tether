import { Navigate, Route, Routes } from 'react-router-dom'
import OperationsLayout from './layouts/OperationsLayout'
import {
  Dashboard, BankAccounts, Transactions, Movements, AccountHistory, Reports,
  Reconciliation, ConnectionStatus, Metrics, BankConnections, UsersPage,
  UserGroups, Audit, Callbacks, SettingsPage,
} from './AppOpsV3'
import SecurityCenterPage from './pages/SecurityCenterPage'
import MultiAccountSandboxPage from './pages/MultiAccountSandboxPage'
import AutomationCenterPage from './pages/AutomationCenterPage'

export default function AppRouter(){
  return <Routes>
    <Route element={<OperationsLayout/>}>
      <Route path="/" element={<Dashboard/>}/>
      <Route path="/bank-accounts" element={<BankAccounts/>}/>
      <Route path="/transactions" element={<Transactions/>}/>
      <Route path="/account-movements" element={<Movements/>}/>
      <Route path="/account-history" element={<AccountHistory/>}/>
      <Route path="/reports" element={<Reports/>}/>
      <Route path="/reconciliation" element={<Reconciliation/>}/>
      <Route path="/connection-status" element={<ConnectionStatus/>}/>
      <Route path="/metrics" element={<Metrics/>}/>
      <Route path="/bank-connections" element={<BankConnections/>}/>
      <Route path="/users" element={<UsersPage/>}/>
      <Route path="/user-groups" element={<UserGroups/>}/>
      <Route path="/audit-log" element={<Audit/>}/>
      <Route path="/callbacks" element={<Callbacks/>}/>
      <Route path="/settings" element={<SettingsPage/>}/>
      <Route path="/security-sessions" element={<SecurityCenterPage/>}/>
      <Route path="/sandbox/multi-account" element={<MultiAccountSandboxPage/>}/>
      <Route path="/automation-center" element={<AutomationCenterPage/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Route>
  </Routes>
}
