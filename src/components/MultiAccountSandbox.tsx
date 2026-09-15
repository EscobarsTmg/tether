import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Landmark, Plus, ShieldCheck } from 'lucide-react'
import type { BankAccount } from '../lib/opsData'
import { supabase } from '../lib/supabase'
import { toSandboxOptions, validateSandboxTransfer } from '../lib/sandboxAccounts'

type LocalAccount = BankAccount & { local?: boolean }

export default function MultiAccountSandbox({accounts}:{accounts:BankAccount[]}){
  const [localAccounts,setLocalAccounts]=useState<LocalAccount[]>([])
  const allAccounts=useMemo(()=>[...accounts,...localAccounts],[accounts,localAccounts])
  const options=useMemo(()=>toSandboxOptions(allAccounts),[allAccounts])
  const[sourceId,setSourceId]=useState('')
  const[amount,setAmount]=useState('')
  const[currency,setCurrency]=useState('TRY')
  const[destinationName,setDestinationName]=useState('')
  const[destinationIban,setDestinationIban]=useState('')
  const[description,setDescription]=useState('')
  const[message,setMessage]=useState<string|null>(null)
  const[busy,setBusy]=useState(false)
  const[showAdd,setShowAdd]=useState(false)
  const[bankName,setBankName]=useState('Sandbox Bank')
  const[accountName,setAccountName]=useState('Test Current Account')
  const[newCurrency,setNewCurrency]=useState('TRY')
  const[newBalance,setNewBalance]=useState('100000')
  const source=options.find(a=>a.id===sourceId)

  useEffect(()=>{
    if(!options.length){setSourceId('');return}
    if(!options.some(a=>a.id===sourceId)){setSourceId(options[0].id);setCurrency(options[0].currency)}
  },[options,sourceId])

  function chooseSource(id:string){setSourceId(id);const next=options.find(a=>a.id===id);if(next)setCurrency(next.currency);setMessage(null)}

  function addSandboxAccount(){
    const balance=Number(newBalance)
    if(!bankName.trim()||!accountName.trim()||!Number.isFinite(balance)||balance<0){setMessage('Test hesabı bilgilerini kontrol edin.');return}
    const id=`sandbox-${Date.now()}`
    const suffix=String(Date.now()).slice(-4)
    setLocalAccounts(v=>[...v,{id,bank_name:bankName.trim(),account_name:accountName.trim(),iban_masked:`TR00 •••• •••• ${suffix}`,currency:newCurrency,balance,deposits_enabled:true,withdrawals_enabled:true,status:'active',updated_at:new Date().toISOString(),local:true}])
    setSourceId(id);setCurrency(newCurrency);setShowAdd(false);setMessage('Yeni test hesabı bu oturum için eklendi.')
  }

  async function createDraft(){
    const errors=validateSandboxTransfer({source,destinationIban,destinationName,amount:Number(amount),currency})
    if(errors.length){setMessage(errors.join(' '));return}
    if(!source)return
    if(source.id.startsWith('sandbox-')||!supabase){setMessage('Sandbox doğrulaması başarılı. Yerel test hesabında gerçek transfer veya sunucu kaydı oluşturulmadı.');return}
    setBusy(true);setMessage(null)
    try{
      const {data,error}=await supabase.functions.invoke('payment-draft',{body:{account_id:source.id,amount:Number(amount),currency,destination_iban:destinationIban,destination_name:destinationName,description}})
      if(error) throw error
      if(data?.code==='RECENT_DUPLICATE') setMessage(`Aynı taslak kısa süre önce oluşturulmuş. Tekrar oluşturulmadı. Kayıt: ${data.payment_request_id}`)
      else setMessage(`Transfer taslağı oluşturuldu. Kayıt: ${data?.payment_request?.id||'hazır'}. Gerçek ödeme başlatılmadı.`)
    }catch(e){setMessage(`Taslak oluşturulamadı: ${e instanceof Error?e.message:'Bilinmeyen hata'}`)}finally{setBusy(false)}
  }

  return <section className="ops-panel">
    <div className="ops-panelhead"><div><h2>Multi-account sandbox</h2><p>Test hesapları ekleyin, kaynak hesabı seçin ve transfer taslağını doğrulayın.</p></div><span className="ops-badge connected"><ShieldCheck size={13}/> Sandbox only</span></div>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}><button className="ops-ghost" onClick={()=>setShowAdd(v=>!v)}><Plus size={15}/> Test hesabı ekle</button><span style={{opacity:.7,alignSelf:'center'}}>{options.length} hesap kullanılabilir</span></div>
    {showAdd&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:18,padding:14,border:'1px solid var(--border,#253047)',borderRadius:12}}><input value={bankName} onChange={e=>setBankName(e.target.value)} placeholder="Banka adı"/><input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Hesap adı"/><select value={newCurrency} onChange={e=>setNewCurrency(e.target.value)}><option>TRY</option><option>EUR</option><option>USD</option><option>GBP</option></select><input value={newBalance} onChange={e=>setNewBalance(e.target.value)} inputMode="decimal" placeholder="Test bakiyesi"/><button className="ops-ghost" onClick={addSandboxAccount}><CheckCircle2 size={15}/> Hesabı oluştur</button></div>}
    {!options.length?<div className="ops-state">Henüz hesap yok. “Test hesabı ekle” ile sandbox hesabı oluşturabilirsiniz.</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
      <div><label>Kaynak hesap</label><select value={sourceId} onChange={e=>chooseSource(e.target.value)} style={{width:'100%',marginTop:6}}>{options.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select>{source&&<div style={{marginTop:12,padding:12,border:'1px solid var(--border,#253047)',borderRadius:10}}><strong style={{display:'flex',gap:8,alignItems:'center'}}><Landmark size={16}/>{source.bankName}</strong><div>{source.accountName}</div><small>{source.ibanMasked} · {source.currency} · {source.balance.toLocaleString('tr-TR')}</small></div>}</div>
      <div><label>Alıcı adı</label><input value={destinationName} onChange={e=>setDestinationName(e.target.value)} placeholder="Sandbox alıcısı" style={{width:'100%',marginTop:6}}/><label style={{display:'block',marginTop:12}}>Alıcı IBAN</label><input value={destinationIban} onChange={e=>setDestinationIban(e.target.value.toUpperCase())} placeholder="TR00 0000 0000 0000 0000 0000 00" style={{width:'100%',marginTop:6}}/><label style={{display:'block',marginTop:12}}>Açıklama</label><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Test transferi" style={{width:'100%',marginTop:6}}/></div>
      <div><label>Tutar</label><input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" style={{width:'100%',marginTop:6}}/><label style={{display:'block',marginTop:12}}>Para birimi</label><select value={currency} onChange={e=>setCurrency(e.target.value)} style={{width:'100%',marginTop:6}}><option>TRY</option><option>EUR</option><option>USD</option><option>GBP</option></select><button disabled={busy} onClick={createDraft} className="ops-ghost" style={{marginTop:14,width:'100%',justifyContent:'center'}}><CheckCircle2 size={15}/>{busy?'Taslak hazırlanıyor…':'Transfer taslağı oluştur'}<ArrowRight size={15}/></button></div>
    </div>}
    {message&&<div className="ops-notices" style={{position:'static',marginTop:14}}><p>{message}</p></div>}
  </section>
}
