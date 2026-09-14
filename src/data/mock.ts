export const accounts = [
  { id: '1', bank: 'DenizBank', name: 'Yunus Aksu', iban: 'TR12 0013 4000 0000 1234 5678 90', balance: 22658.46, deposits: true, withdrawals: false, status: 'active' },
  { id: '2', bank: 'Akbank', name: 'Demo Corporate', iban: 'TR61 0004 6000 0000 9876 5432 10', balance: 184220.30, deposits: true, withdrawals: true, status: 'active' },
  { id: '3', bank: 'Garanti BBVA', name: 'Sandbox Account', iban: 'TR35 0006 2000 0000 4455 6677 88', balance: 7450.00, deposits: false, withdrawals: false, status: 'suspended' },
]

export const transactions = [
  { id: 'TX-10491', date: '15 Sep 2026 00:18', type: 'Deposit', method: 'FAST', counterparty: 'Demo Customer', iban: 'TR11 •••• 4512', account: 'Yunus Aksu', bank: 'DenizBank', amount: 2500, balanceAfter: 22658.46, status: 'completed' },
  { id: 'TX-10490', date: '14 Sep 2026 23:42', type: 'Withdrawal', method: 'EFT', counterparty: 'Sandbox Vendor', iban: 'TR44 •••• 1098', account: 'Demo Corporate', bank: 'Akbank', amount: -8750, balanceAfter: 184220.30, status: 'review' },
  { id: 'TX-10489', date: '14 Sep 2026 21:03', type: 'Deposit', method: 'Havale', counterparty: 'Test User', iban: 'TR20 •••• 7766', account: 'Sandbox Account', bank: 'Garanti BBVA', amount: 1025, balanceAfter: 7450, status: 'completed' },
]

export const history = [
  { time: '15 Sep 2026, 00:08', bank: 'DenizBank', account: 'Yunus Aksu', event: 'Account connected', status: 'active' },
  { time: '14 Sep 2026, 22:51', bank: 'Garanti BBVA', account: 'Sandbox Account', event: 'Account suspended for manual review', status: 'suspended' },
  { time: '14 Sep 2026, 18:12', bank: 'Akbank', account: 'Demo Corporate', event: 'Daily limits refreshed', status: 'active' },
]
