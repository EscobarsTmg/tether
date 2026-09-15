import type { Page } from 'puppeteer';
import { BaseScraper } from './BaseScraper.js';
import type { AccountSnapshot, ScrapedTransaction } from './types.js';

const ACCOUNT_ACTIVITY_URL = 'https://sube.garantibbva.com.tr/isube/accountactivity/accountactivity';
const DASHBOARD_SELECTORS = ['.hesapOzeti', '#financialStatusArea', '.dashboard-container'];
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function parseMoney(value: string): number {
  const negative = value.includes('-') || value.includes('(');
  const cleaned = value.replace(/\s/g, '').replace(/TRY|TL|₺|USD|EUR/gi, '').replace(/[()\-]/g, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -Math.abs(parsed) : parsed;
}

function normalizeCurrency(value: string): string {
  const upper = value.toUpperCase();
  if (upper.includes('USD')) return 'USD';
  if (upper.includes('EUR')) return 'EUR';
  return 'TRY';
}

function normalizeDate(value: string): string {
  const match = value.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (!match) return new Date().toISOString();
  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export class GarantiScraper extends BaseScraper {
  private async waitForAnySelector(page: Page, selectors: string[], timeout = 15_000): Promise<string | null> {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      for (const selector of selectors) if (await page.$(selector)) return selector;
      await delay(300);
    }
    return null;
  }

  private async isLoggedIn(page: Page): Promise<boolean> {
    const url = page.url().toLowerCase();
    if (url.includes('mobiletokenverifynew') || url.includes('/login/')) return false;
    return Boolean(await this.waitForAnySelector(page, DASHBOARD_SELECTORS, 5_000));
  }

  async loginAndGetSession(page: Page): Promise<Page> {
    if (await this.isLoggedIn(page)) {
      await this.saveCookies(page);
      return page;
    }

    await page.goto(this.config.startUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#custno', { visible: true, timeout: 20_000 });
    await page.waitForSelector('#password', { visible: true, timeout: 20_000 });
    await page.waitForSelector('#formSubmit', { visible: true, timeout: 20_000 });

    await page.click('#custno', { clickCount: 3 });
    await page.type('#custno', this.config.username, { delay: 30 });
    await page.click('#password', { clickCount: 3 });
    await page.type('#password', this.config.password, { delay: 30 });

    await Promise.allSettled([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30_000 }),
      page.click('#formSubmit'),
    ]);

    // Do not bypass bank MFA. Wait for the account owner to complete normal mobile approval.
    if (page.url().toLowerCase().includes('mobiletokenverifynew')) {
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline && page.url().toLowerCase().includes('mobiletokenverifynew')) await delay(1_000);
    }

    if (!(await this.waitForAnySelector(page, DASHBOARD_SELECTORS, 60_000))) {
      throw new Error('Garanti session could not be verified or mobile approval timed out.');
    }

    await this.saveCookies(page);
    return page;
  }

  async scrapeAccountSnapshot(page: Page): Promise<AccountSnapshot> {
    if (!(await this.isLoggedIn(page))) throw new Error('Garanti session is not authenticated.');

    const balanceText = await page.evaluate(() => {
      for (const selector of ['.totalBalanceAmount', '.total-balance', '#balanceAmount']) {
        const text = document.querySelector<HTMLElement>(selector)?.innerText?.trim();
        if (text) return text;
      }
      return '';
    });

    const balance = parseMoney(balanceText);
    const currency = normalizeCurrency(balanceText);

    const accountInfo = await page.evaluate(() => {
      const row = document.querySelector<HTMLTableRowElement>('#investmentAccountGrid0 tbody tr');
      if (!row) return { accountNumber: '', accountName: '', iban: '' };
      const mainText = row.querySelector<HTMLElement>('.tableMainItem, [class*="tableMainItem"], td:first-child')?.innerText?.trim() ?? '';
      const match = mainText.match(/(\d+)\s*-\s*(\d+)\s+(.+)/);
      const ibanText = row.querySelector<HTMLElement>('.text-muted.mutedFont, .mutedFont, [class*="iban"]')?.innerText ?? '';
      const ibanMatch = ibanText.match(/TR[\d\s]{20,}/i);
      return {
        accountNumber: match?.[2] ?? '',
        accountName: match?.[3]?.trim() ?? mainText,
        iban: ibanMatch?.[0]?.replace(/\s/g, '').toUpperCase() ?? '',
      };
    });

    const accountNumberMasked = accountInfo.accountNumber
      ? `****${accountInfo.accountNumber.slice(-4)}`
      : accountInfo.iban ? `****${accountInfo.iban.slice(-4)}` : '****0000';

    let transactions: ScrapedTransaction[] = [];
    try {
      await page.goto(ACCOUNT_ACTIVITY_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      if (page.url().toLowerCase().includes('mobiletokenverifynew')) {
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline && page.url().toLowerCase().includes('mobiletokenverifynew')) await delay(1_000);
        if (page.url().toLowerCase().includes('mobiletokenverifynew')) throw new Error('Mobile approval required for account activity.');
      }

      await page.waitForSelector('table tbody tr', { timeout: 15_000 });
      const rows = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLTableRowElement>('table tbody tr')).slice(0, 50).map((row) =>
        Array.from(row.querySelectorAll<HTMLTableCellElement>('td')).map((cell) => cell.innerText.replace(/\s+/g, ' ').trim())
      ).filter((cells) => cells.length >= 3));

      transactions = rows.map((cells, index) => {
        const amount = parseMoney(cells[2] ?? '');
        return {
          externalRef: ['garanti', accountNumberMasked, cells[0], cells[1], amount.toFixed(2), index].join('|').slice(0, 250),
          occurredAt: normalizeDate(cells[0] ?? ''),
          amount,
          method: 'scraped',
          counterparty: cells[1] || null,
          counterpartyIbanMasked: null,
          balanceAfter: cells[3] ? parseMoney(cells[3]) : null,
          status: 'completed',
          metadata: { source: 'garanti', currency: normalizeCurrency(cells[2] ?? ''), rawDate: cells[0], rawAmount: cells[2] },
        } satisfies ScrapedTransaction;
      });
    } catch {
      transactions = [];
    }

    await this.saveCookies(page);
    return {
      bankName: this.config.bankName || 'Garanti BBVA',
      accountName: accountInfo.accountName || 'Garanti Account',
      accountNumberMasked,
      currency,
      balance,
      transactions,
    };
  }
}
