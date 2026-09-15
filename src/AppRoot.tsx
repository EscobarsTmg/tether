import { Link, Route, Routes } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import AppOpsV3 from './AppOpsV3'
import SecurityCenter from './SecurityCenter'

function OperationsWithSecurityShortcut(){
  return <>
    <AppOpsV3 />
    <Link className="security-shortcut" to="/security-sessions"><ShieldCheck size={15}/> Security Center</Link>
  </>
}

export default function AppRoot(){
  return <Routes>
    <Route path="/security-sessions" element={<SecurityCenter/>}/>
    <Route path="/*" element={<OperationsWithSecurityShortcut/>}/>
  </Routes>
}
