export const accounts = [
  { id: '1', bank: 'DenizBank', name: 'Sandbox Primary', iban: 'TR12 0013 4000 0000 1234 5678 90', balance: 22658.46, deposits: true, withdrawals: false, status: 'active' },
  { id: '2', bank: 'Akbank', name: 'Demo Corporate', iban: 'TR61 0004 6000 0000 9876 5432 10', balance: 184220.30, deposits: true, withdrawals: true, status: 'active' },
  { id: '3', bank: 'Garanti BBVA', name: 'Sandbox Reserve', iban: 'TR35 0006 2000 0000 4455 6677 88', balance: 7450.00, deposits: false, withdrawals: false, status: 'suspended' },
]

export const transactions = [
  { id: 'TX-10491', date: '15 Sep 2026 00:18', type: 'Deposit', method: 'FAST', counterparty: 'Demo Customer', iban: 'TR11 •••• 4512', account: 'Sandbox Primary', bank: 'DenizBank', amount: 2500, balanceAfter: 22658.46, status: 'completed' },
  { id: 'TX-10490', date: '14 Sep 2026 23:42', type: 'Withdrawal', method: 'EFT', counterparty: 'Sandbox Vendor', iban: 'TR44 •••• 1098', account: 'Demo Corporate', bank: 'Akbank', amount: -8750, balanceAfter: 184220.30, status: 'review' },
  { id: 'TX-10489', date: '14 Sep 2026 21:03', type: 'Deposit', method: 'Havale', counterparty: 'Test User', iban: 'TR20 •••• 7766', account: 'Sandbox Reserve', bank: 'Garanti BBVA', amount: 1025, balanceAfter: 7450, status: 'completed' },
  { id: 'TX-10488', date: '14 Sep 2026 19:37', type: 'Deposit', method: 'FAST', counterparty: 'QA Merchant', iban: 'TR72 •••• 5581', account: 'Demo Corporate', bank: 'Akbank', amount: 4800, balanceAfter: 192970.30, status: 'completed' },
  { id: 'TX-10487', date: '14 Sep 2026 18:04', type: 'Withdrawal', method: 'Internal', counterparty: 'Sandbox Treasury', iban: 'TR09 •••• 9910', account: 'Sandbox Primary', bank: 'DenizBank', amount: -1200, balanceAfter: 20158.46, status: 'completed' },
]

export const movements = [
  { id: 'MV-55021', time: '15 Sep 2026 00:18:12', account: 'Sandbox Primary', bank: 'DenizBank', kind: 'Incoming credit', reference: 'REF-914502', amount: 2500, runningBalance: 22658.46, source: 'Bank feed', status: 'posted' },
  { id: 'MV-55020', time: '14 Sep 2026 23:42:44', account: 'Demo Corporate', bank: 'Akbank', kind: 'Outgoing debit', reference: 'REF-914498', amount: -8750, runningBalance: 184220.30, source: 'Sandbox API', status: 'review' },
  { id: 'MV-55019', time: '14 Sep 2026 21:03:09', account: 'Sandbox Reserve', bank: 'Garanti BBVA', kind: 'Incoming credit', reference: 'REF-914477', amount: 1025, runningBalance: 7450, source: 'Bank feed', status: 'posted' },
  { id: 'MV-55018', time: '14 Sep 2026 18:12:33', account: 'Demo Corporate', bank: 'Akbank', kind: 'System adjustment', reference: 'SYS-440012', amount: 0, runningBalance: 192970.30, source: 'System', status: 'posted' },
]

export const history = [
  { time: '15 Sep 2026, 00:08', bank: 'DenizBank', account: 'Sandbox Primary', event: 'Account connected', status: 'active' },
  { time: '14 Sep 2026, 22:51', bank: 'Garanti BBVA', account: 'Sandbox Reserve', event: 'Account suspended for manual review', status: 'suspended' },
  { time: '14 Sep 2026, 18:12', bank: 'Akbank', account: 'Demo Corporate', event: 'Daily limits refreshed', status: 'active' },
  { time: '14 Sep 2026, 16:40', bank: 'DenizBank', account: 'Sandbox Primary', event: 'Transaction feed synchronized', status: 'completed' },
]

export const users = [
  { id: 'USR-001', name: 'Operations Admin', email: 'admin@example.test', role: 'Admin', group: 'Operations', lastSeen: '15 Sep 2026 00:31', status: 'active' },
  { id: 'USR-002', name: 'Risk Reviewer', email: 'risk@example.test', role: 'Reviewer', group: 'Risk', lastSeen: '14 Sep 2026 23:55', status: 'active' },
  { id: 'USR-003', name: 'Read Only User', email: 'viewer@example.test', role: 'Viewer', group: 'Compliance', lastSeen: '14 Sep 2026 19:10', status: 'suspended' },
]

export const auditLogs = [
  { id: 'AUD-8841', time: '15 Sep 2026 00:31:02', actor: 'Operations Admin', action: 'SESSION_LOGIN', resource: 'Admin console', detail: 'Successful sandbox sign-in', severity: 'info' },
  { id: 'AUD-8840', time: '15 Sep 2026 00:18:14', actor: 'System', action: 'FEED_SYNC', resource: 'DenizBank / Sandbox Primary', detail: '1 new movement imported', severity: 'success' },
  { id: 'AUD-8839', time: '14 Sep 2026 23:43:01', actor: 'Risk Reviewer', action: 'TRANSACTION_FLAGGED', resource: 'TX-10490', detail: 'Marked for manual review', severity: 'warning' },
  { id: 'AUD-8838', time: '14 Sep 2026 22:51:19', actor: 'System', action: 'ACCOUNT_STATUS_CHANGE', resource: 'Garanti BBVA / Sandbox Reserve', detail: 'Status changed to suspended', severity: 'warning' },
]

export const reconciliationRows = [
  { id: 'REC-2101', account: 'Sandbox Primary', bank: 'DenizBank', ledgerBalance: 22658.46, bankBalance: 22658.46, difference: 0, checkedAt: '15 Sep 2026 00:20', status: 'matched' },
  { id: 'REC-2102', account: 'Demo Corporate', bank: 'Akbank', ledgerBalance: 184220.30, bankBalance: 184220.30, difference: 0, checkedAt: '15 Sep 2026 00:20', status: 'matched' },
  { id: 'REC-2103', account: 'Sandbox Reserve', bank: 'Garanti BBVA', ledgerBalance: 7450, bankBalance: 7475, difference: 25, checkedAt: '15 Sep 2026 00:20', status: 'investigate' },
]

export const dailyReport = [
  { label: 'Incoming volume', value: 8325, change: '+12.4%' },
  { label: 'Outgoing volume', value: 9950, change: '-4.8%' },
  { label: 'Net flow', value: -1625, change: 'Today' },
  { label: 'Matched reconciliation', value: 2, change: 'of 3 accounts' },
]
