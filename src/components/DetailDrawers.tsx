import { Copy, ExternalLink, Landmark, X } from 'lucide-react'
import { accounts, transactions } from '../data/mock'

type Transaction = (typeof transactions)[number]
type Account = (typeof accounts)[number]

function CopyButton({ value }: { value: string }) {
  return <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(value)} title="Copy"><Copy size={14}/></button>
}

export function TransactionDrawer({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  if (!transaction) return null
  const positive = transaction.amount >= 0
  return <div className="drawer-layer" onMouseDown={e => e.currentTarget === e.target && onClose()}>
    <aside className="detail-drawer">
      <div className="drawer-head"><div><span className="drawer-kicker">TRANSACTION</span><h2>{transaction.id}</h2></div><button className="drawer-close" onClick={onClose}><X size={18}/></button></div>
      <div className={`amount-hero ${positive ? 'credit' : 'debit'}`}><span>{transaction.type}</span><strong>{positive?'+':'-'}₺{Math.abs(transaction.amount).toLocaleString('tr-TR')}</strong><small>{transaction.status.toUpperCase()} · {transaction.method}</small></div>
      <div className="drawer-section"><h3>Transaction details</h3>
        <div className="detail-grid"><div><span>Date</span><strong>{transaction.date}</strong></div><div><span>Bank</span><strong>{transaction.bank}</strong></div><div><span>Account</span><strong>{transaction.account}</strong></div><div><span>Balance after</span><strong>₺{transaction.balanceAfter.toLocaleString('tr-TR',{minimumFractionDigits:2})}</strong></div></div>
      </div>
      <div className="drawer-section"><h3>Counterparty</h3><div className="detail-line"><div><span>Name</span><strong>{transaction.counterparty}</strong></div></div><div className="detail-line"><div><span>IBAN</span><strong className="mono">{transaction.iban}</strong></div><CopyButton value={transaction.iban}/></div></div>
      <div className="drawer-section"><h3>Audit preview</h3><div className="audit-mini"><i/><div><strong>Normalized into sandbox ledger</strong><span>Transaction ingestion completed successfully.</span></div></div><div className="audit-mini"><i/><div><strong>Balance snapshot recorded</strong><span>Running balance is available for reconciliation.</span></div></div></div>
      <button className="drawer-action"><ExternalLink size={15}/> Open full activity trail</button>
    </aside>
  </div>
}

export function AccountDrawer({ account, onClose }: { account: Account | null; onClose: () => void }) {
  if (!account) return null
  return <div className="drawer-layer" onMouseDown={e => e.currentTarget === e.target && onClose()}>
    <aside className="detail-drawer">
      <div className="drawer-head"><div><span className="drawer-kicker">BANK ACCOUNT</span><h2>{account.bank}</h2></div><button className="drawer-close" onClick={onClose}><X size={18}/></button></div>
      <div className="account-hero"><div className="bank-icon"><Landmark size={22}/></div><div><span>{account.name}</span><strong>₺{account.balance.toLocaleString('tr-TR',{minimumFractionDigits:2})}</strong><small>{account.status.toUpperCase()}</small></div></div>
      <div className="drawer-section"><h3>Account identity</h3><div className="detail-line"><div><span>IBAN</span><strong className="mono">{account.iban}</strong></div><CopyButton value={account.iban}/></div><div className="detail-grid"><div><span>Deposits</span><strong>{account.deposits?'Enabled':'Disabled'}</strong></div><div><span>Withdrawals</span><strong>{account.withdrawals?'Enabled':'Disabled'}</strong></div></div></div>
      <div className="drawer-section"><h3>Operational health</h3><div className="health-meter"><div style={{width: account.status==='active'?'96%':'61%'}}/><span>{account.status==='active'?'Healthy connection':'Manual review recommended'}</span></div></div>
      <button className="drawer-action"><ExternalLink size={15}/> Open account workspace</button>
    </aside>
  </div>
}
