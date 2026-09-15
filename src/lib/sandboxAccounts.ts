import type { BankAccount } from './opsData'

export type SandboxAccountOption = {
  id: string
  label: string
  bankName: string
  accountName: string
  ibanMasked: string
  currency: string
  balance: number
  canDeposit: boolean
  canWithdraw: boolean
  status: 'active'|'disabled'
}

export function toSandboxOptions(accounts: BankAccount[]): SandboxAccountOption[] {
  return accounts.map(a => ({
    id: a.id,
    label: `${a.bank_name} · ${a.account_name} · ${a.iban_masked}`,
    bankName: a.bank_name,
    accountName: a.account_name,
    ibanMasked: a.iban_masked,
    currency: a.currency,
    balance: Number(a.balance || 0),
    canDeposit: Boolean(a.deposits_enabled),
    canWithdraw: Boolean(a.withdrawals_enabled),
    status: ['active','connected'].includes(String(a.status).toLowerCase()) ? 'active' : 'disabled',
  }))
}

export function validateSandboxTransfer(input: {
  source?: SandboxAccountOption
  destinationIban: string
  destinationName: string
  amount: number
  currency: string
}) {
  const errors: string[] = []
  if (!input.source) errors.push('Kaynak hesap seçilmedi.')
  if (input.source && input.source.status !== 'active') errors.push('Kaynak hesap aktif değil.')
  if (input.source && !input.source.canWithdraw) errors.push('Kaynak hesap transfer/çekim işlemine kapalı.')
  if (!Number.isFinite(input.amount) || input.amount <= 0) errors.push('Tutar 0’dan büyük olmalı.')
  if (input.source && input.amount > input.source.balance) errors.push('Yetersiz bakiye.')
  if (!input.destinationName.trim()) errors.push('Alıcı adı zorunlu.')
  if (!/^[A-Z]{2}[A-Z0-9 ]{13,32}$/i.test(input.destinationIban.trim())) errors.push('IBAN biçimi geçersiz.')
  if (input.source && input.currency !== input.source.currency) errors.push('Para birimi kaynak hesapla eşleşmiyor.')
  return errors
}
