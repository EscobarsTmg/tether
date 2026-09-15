import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Landmark, ShieldCheck } from 'lucide-react'
import type { BankAccount } from '../lib/opsData'
import { toSandboxOptions, validateSandboxTransfer } from '../lib/sandboxAccounts'

export default function MultiAccountSandbox({accounts}:{accounts:BankAccount[]}){
  const options=useMemo(()=>toSandboxOptions(accounts),[accounts])
  const[sourceId,setSourceId]=useState('')
  const[amount,setAmount]=useState('')
  const[currency,setCurrency]=useState('TRY')
  const[destinationName,setDestinationName]=useState('')
  const[destinationIban,setDestinationIban]=useState('')
  const[message,setMessage]=useState<string|null>(null)
  const source=options.find(a=>a.id===sourceId)

  useEffect(()=>{
    if(!options.length){setSourceId('');return}
    if(!options.some(a=>a.id===sourceId)){
      setSourceId(options[0].id)
      setCurrency(options[0].currency)
    }
  },[options,sourceId])

  function chooseSource(id:string){
    setSourceId(id)
    const next=options.find(a=>a.id===id)
    if(next)setCurrency(next.currency)
    setMessage(null)
  }

  function validate(){
    const errors=validateSandboxTransfer({source,destinationIban,destinationName,amount:Number(amount),currency})
    setMessage(errors.length?errors.join(' '):'Sandbox doğrulaması başarılı. Gerçek transfer başlatılmadı.')
  }

  if(!options.length)return <section className="ops-panel"><div className="ops-panelhead"><div><h2>Multi-account sandbox</h2><p>Test edilecek bağlı hesap bulunamadı.</p></div><span className="ops-badge connected"><ShieldCheck size={13}/> Sandbox only</span></div></section>

  return <section className="ops-panel">
    <div className="ops-panelhead"><div><h2>Multi-account sandbox</h2><p>Birden fazla bağlı hesabı seçip transfer hazırlama akışını güvenli şekilde test edin.</p></div><span className="ops-badge connected"><ShieldCheck size={13}/> Sandbox only</span></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
      <div><label>Kaynak hesap</label><select value={sourceId} onChange={e=>chooseSource(e.target.value)} style={{width:'100%',marginTop:6}}>{options.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select>{source&&<div style={{marginTop:12,padding:12,border:'1px solid var(--border,#253047)',borderRadius:10}}><strong style={{display:'flex',gap:8,alignItems:'center'}}><Landmark size={16}/>{source.bankName}</strong><div>{source.accountName}</div><small>{source.ibanMasked} · {source.currency} · {source.balance.toLocaleString('tr-TR')}</small></div>}</div>
      <div><label>Alıcı adı</label><input value={destinationName} onChange={e=>setDestinationName(e.target.value)} placeholder="Sandbox alıcısı" style={{width:'100%',marginTop:6}}/><label style={{display:'block',marginTop:12}}>Alıcı IBAN</label><input value={destinationIban} onChange={e=>setDestinationIban(e.target.value.toUpperCase())} placeholder="TR00 0000 0000 0000 0000 0000 00" style={{width:'100%',marginTop:6}}/></div>
      <div><label>Tutar</label><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={{width:'100%',marginTop:6}}/><label style={{display:'block',marginTop:12}}>Para birimi</label><select value={currency} onChange={e=>setCurrency(e.target.value)} style={{width:'100%',marginTop:6}}><option>TRY</option><option>EUR</option><option>USD</option><option>GBP</option></select><button onClick={validate} className="ops-ghost" style={{marginTop:14,width:'100%',justifyContent:'center'}}><CheckCircle2 size={15}/> Akışı doğrula <ArrowRight size={15}/></button></div>
    </div>
    {message&&<div className="ops-notices" style={{position:'static',marginTop:14}}><p>{message}</p></div>}
  </section>
}
