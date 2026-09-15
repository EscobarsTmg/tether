import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MultiAccountSandbox from './components/MultiAccountSandbox'
import { useOpsData } from './lib/opsData'

export default function MultiAccountSandboxPage(){
  const d=useOpsData()
  return <div className="ops-page" style={{padding:24}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:18}}>
      <div><h1 style={{margin:0}}>Multi-account Sandbox</h1><p style={{margin:'6px 0 0'}}>Gerçek banka kimlik bilgileri toplamadan hesap seçimi ve transfer doğrulama testi.</p></div>
      <Link className="ops-ghost" to="/bank-accounts"><ArrowLeft size={15}/> Bank Accounts</Link>
    </div>
    {d.loading&&<div className="ops-state">Hesaplar yükleniyor…</div>}
    {d.error&&<div className="ops-error">{d.error}</div>}
    {!d.loading&&!d.error&&<MultiAccountSandbox accounts={d.accounts}/>} 
  </div>
}
