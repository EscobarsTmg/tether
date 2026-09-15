import type { Page } from 'puppeteer';
import { BaseScraper } from './BaseScraper.js';
import type { AccountSnapshot } from './types.js';

export class BankBScraper extends BaseScraper {
  async loginAndGetSession(page: Page): Promise<Page> {
    // Bank-specific authorized login flow belongs here.
    await this.saveCookies(page);
    return page;
  }

  async scrapeAccountSnapshot(_page: Page): Promise<AccountSnapshot> {
    return {
      bankName: this.config.bankName,
      accountName: 'Main Account',
      accountNumberMasked: '****0000',
      currency: 'EUR',
      balance: 0,
      transactions: []
    };
  }
}
