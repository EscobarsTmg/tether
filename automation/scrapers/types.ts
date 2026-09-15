import type { Page } from 'puppeteer';

export interface BankConfig {
  id: string;
  enabled: boolean;
  scraper: string;
  bankName: string;
  providerId: string;
  startUrl: string;
  usernameEnv: string;
  passwordEnv: string;
}

export interface ResolvedBankConfig extends BankConfig {
  username: string;
  password: string;
  cookieFile: string;
}

export interface ScrapedTransaction {
  externalRef?: string | null;
  occurredAt?: string;
  amount: number;
  method?: string;
  counterparty?: string | null;
  counterpartyIbanMasked?: string | null;
  balanceAfter?: number | null;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface AccountSnapshot {
  bankName: string;
  accountName: string;
  accountNumberMasked: string;
  currency: string;
  balance: number;
  transactions: ScrapedTransaction[];
}

export interface BankScraper {
  openStartPage(page: Page): Promise<void>;
  loginAndGetSession(page: Page): Promise<Page>;
  scrapeAccountSnapshot(page: Page): Promise<AccountSnapshot>;
}
