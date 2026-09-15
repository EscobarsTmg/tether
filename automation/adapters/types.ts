export type ProviderAccount = { externalId:string; bankName:string; name:string; ibanMasked:string; currency:string; balance:number }
export type ProviderTransaction = { externalRef:string; accountExternalId:string; occurredAt:string; direction:'deposit'|'withdrawal'; method:string; counterparty?:string; counterpartyIbanMasked?:string; amount:number; balanceAfter?:number; status:string }
export type PaymentDraft = { idempotencyKey:string; fromAccountExternalId:string; amount:number; currency:string; destinationName:string; destinationIbanMasked:string; description?:string }
export type PaymentResult = { providerPaymentId:string; status:'awaiting_user_auth'|'submitted'|'processing'|'settled'|'failed'; authorizationUrl?:string }

export interface BankAdapter {
  readonly key:string
  createConsent(userId:string):Promise<{authorizationUrl:string; externalConnectionId?:string}>
  exchangeAuthorization(input:{code:string; state?:string}):Promise<{externalConnectionId:string; expiresAt?:string}>
  fetchAccounts(externalConnectionId:string):Promise<ProviderAccount[]>
  fetchTransactions(externalConnectionId:string, accountExternalId:string, since?:string):Promise<ProviderTransaction[]>
  initiatePayment(externalConnectionId:string, draft:PaymentDraft):Promise<PaymentResult>
  getPaymentStatus(externalConnectionId:string, providerPaymentId:string):Promise<PaymentResult>
  healthCheck(externalConnectionId:string):Promise<{ok:boolean; reason?:string}>
}
