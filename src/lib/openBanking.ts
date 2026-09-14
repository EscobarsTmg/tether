export type ProviderConnectionStatus = 'pending'|'connected'|'expired'|'revoked'|'error'

export type OpenBankingAccount = {
  providerAccountId: string
  bankName: string
  accountName: string
  ibanMasked: string
  currency: string
  balance: number
  status: string
}

export type OpenBankingTransaction = {
  providerTransactionId: string
  providerAccountId: string
  occurredAt: string
  direction: 'deposit'|'withdrawal'
  method: string
  counterparty?: string
  counterpartyIbanMasked?: string
  amount: number
  balanceAfter?: number
  status: string
}

export type PaymentInitiationResult = {
  providerPaymentId: string
  status: 'awaiting_user_auth'|'submitted'|'processing'
  authorizationUrl?: string
}

export interface OpenBankingProviderAdapter {
  readonly provider: string
  createConsent(returnUrl: string): Promise<{ authorizationUrl: string; state: string }>
  exchangeAuthorization(code: string, state: string): Promise<{ externalConnectionId: string; consentExpiresAt?: string }>
  listAccounts(externalConnectionId: string): Promise<OpenBankingAccount[]>
  listTransactions(externalConnectionId: string, providerAccountId: string, cursor?: string): Promise<{ items: OpenBankingTransaction[]; nextCursor?: string }>
  initiatePayment(input: {
    externalConnectionId: string
    providerAccountId: string
    amount: number
    currency: string
    destinationIban: string
    destinationName: string
    description?: string
    returnUrl: string
  }): Promise<PaymentInitiationResult>
  getPaymentStatus(providerPaymentId: string): Promise<string>
}

// Provider implementations live server-side only. The browser never receives
// bank credentials, client secrets, PINs, OTPs, access tokens, or signing keys.
