import fs from 'node:fs/promises';
import path from 'node:path';
import type { CookieData, Page } from 'puppeteer';
import type { AccountSnapshot, BankScraper, ResolvedBankConfig } from './types.js';

export abstract class BaseScraper implements BankScraper {
  constructor(protected readonly config: ResolvedBankConfig) {}

  abstract loginAndGetSession(page: Page): Promise<Page>;
  abstract scrapeAccountSnapshot(page: Page): Promise<AccountSnapshot>;

  protected async restoreCookies(page: Page): Promise<boolean> {
    try {
      const cookies = JSON.parse(await fs.readFile(this.config.cookieFile, 'utf8')) as CookieData[];
      if (!cookies.length) return false;
      await page.setCookie(...cookies);
      return true;
    } catch {
      return false;
    }
  }

  protected async saveCookies(page: Page): Promise<void> {
    await fs.mkdir(path.dirname(this.config.cookieFile), { recursive: true });
    const cookies = await page.cookies();
    await fs.writeFile(this.config.cookieFile, JSON.stringify(cookies, null, 2), 'utf8');
  }

  async openStartPage(page: Page): Promise<void> {
    await this.restoreCookies(page);
    await page.goto(this.config.startUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }
}
