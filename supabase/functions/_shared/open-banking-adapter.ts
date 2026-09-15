import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export type OpenBankingAccount = {
  providerAccountId: string;
  bankName: string;
  accountName: string;
  ibanMasked: string;
  currency: string;
  balance: number;
  status: string;
};

export type OpenBankingTransaction = {
  providerTransactionId: string;
  providerAccountId: string;
  occurredAt: string;
  direction: "deposit" | "withdrawal";
  method: string;
  counterparty?: string;
  counterpartyIbanMasked?: string;
  amount: number;
  balanceAfter?: number;
  status: string;
};

export type PaymentInitiationResult = {
  providerPaymentId: string;
  status: "awaiting_user_auth" | "submitted" | "processing";
  authorizationUrl?: string;
};

export interface OpenBankingProviderAdapter {
  readonly provider: string;
  createConsent(returnUrl: string): Promise<{ authorizationUrl: string; state: string }>;
  exchangeAuthorization(code: string, state: string): Promise<{ externalConnectionId: string; consentExpiresAt?: string }>;
  listAccounts(externalConnectionId: string): Promise<OpenBankingAccount[]>;
  listTransactions(externalConnectionId: string, providerAccountId: string, cursor?: string): Promise<{ items: OpenBankingTransaction[]; nextCursor?: string }>;
  initiatePayment(input: {
    externalConnectionId: string;
    providerAccountId: string;
    amount: number;
    currency: string;
    destinationIban: string;
    destinationName: string;
    description?: string;
    returnUrl: string;
  }): Promise<PaymentInitiationResult>;
  getPaymentStatus(providerPaymentId: string): Promise<string>;
}

export class AdapterError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly detail?: unknown;

  constructor(code: string, message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const env = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new AdapterError("ENV_MISSING", `Missing environment variable: ${name}`);
  return value;
};

export class HttpOpenBankingAdapter implements OpenBankingProviderAdapter {
  readonly provider: string;
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(provider: string) {
    this.provider = provider;
    this.baseUrl = env("ADAPTER_URL").replace(/\/+$/, "");
    this.secret = env("ADAPTER_SECRET");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secret}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });

      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new AdapterError("ADAPTER_HTTP_ERROR", `Adapter returned HTTP ${response.status}`, response.status, body);
      }
      return body as T;
    } catch (error) {
      if (error instanceof AdapterError) throw error;
      throw new AdapterError("ADAPTER_REQUEST_FAILED", error instanceof Error ? error.message : "Adapter request failed", undefined, error);
    }
  }

  createConsent(returnUrl: string) {
    return this.request<{ authorizationUrl: string; state: string }>("/consents", {
      method: "POST",
      body: JSON.stringify({ provider: this.provider, returnUrl }),
    });
  }

  exchangeAuthorization(code: string, state: string) {
    return this.request<{ externalConnectionId: string; consentExpiresAt?: string }>("/authorizations/exchange", {
      method: "POST",
      body: JSON.stringify({ provider: this.provider, code, state }),
    });
  }

  async listAccounts(externalConnectionId: string): Promise<OpenBankingAccount[]> {
    const query = new URLSearchParams({ provider: this.provider, externalConnectionId });
    const result = await this.request<{ items: OpenBankingAccount[] }>(`/accounts?${query.toString()}`);
    return result.items;
  }

  listTransactions(externalConnectionId: string, providerAccountId: string, cursor?: string) {
    const query = new URLSearchParams({ provider: this.provider, externalConnectionId, providerAccountId });
    if (cursor) query.set("cursor", cursor);
    return this.request<{ items: OpenBankingTransaction[]; nextCursor?: string }>(`/transactions?${query.toString()}`);
  }

  initiatePayment(input: {
    externalConnectionId: string;
    providerAccountId: string;
    amount: number;
    currency: string;
    destinationIban: string;
    destinationName: string;
    description?: string;
    returnUrl: string;
  }) {
    return this.request<PaymentInitiationResult>("/payments", {
      method: "POST",
      body: JSON.stringify({ provider: this.provider, ...input }),
    });
  }

  async getPaymentStatus(providerPaymentId: string): Promise<string> {
    const query = new URLSearchParams({ provider: this.provider });
    const result = await this.request<{ status: string }>(`/payments/${encodeURIComponent(providerPaymentId)}?${query.toString()}`);
    return result.status;
  }
}

export const createOpenBankingAdapter = (provider: string) => new HttpOpenBankingAdapter(provider);
