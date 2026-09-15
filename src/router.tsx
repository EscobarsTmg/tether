import { Link, Route, Routes } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import AppOpsV3 from './AppOpsV3'
import SecurityCenter from './pages/SecurityCenterPage'
import MultiAccountSandboxPage from './pages/MultiAccountSandboxPage'
import AutomationCenter from './pages/AutomationCenterPage'

function OperationsWithSecurityShortcut(){
  return <>
    <AppOpsV3 />
    <Link className="security-shortcut" to="/security-sessions"><ShieldCheck size={15}/> Security Center</Link>
  </>
}

export default function AppRoot(){
  return <Routes>
    <Route path="/security-sessions" element={<SecurityCenter/>}/>
    <Route path="/sandbox/multi-account" element={<MultiAccountSandboxPage/>}/>
    <Route path="/automation-center" element={<AutomationCenter/>}/>
    <Route path="/*" element={<OperationsWithSecurityShortcut/>}/>
  </Routes>
}
