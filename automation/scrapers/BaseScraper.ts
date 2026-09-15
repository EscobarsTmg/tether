import type { Page } from 'puppeteer';
import { saveSession, loadSession, deleteSession, StoredSession } from '../persistence/sessionStore.js';

export abstract class BaseScraper {
  protected config: any;
  protected connectionId: string;

  constructor(config: any, connectionId: string) {
    this.config = config;
    this.connectionId = connectionId;
  }

  async saveCookies(page: Page): Promise<void> {
    const cookies = await page.cookies();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const session: StoredSession = {
      cookies,
      userAgent,
      savedAt: new Date().toISOString()
    };
    await saveSession(this.connectionId, session);
    console.log(`🍪 Çerezler Supabase'e kaydedildi. connectionId=${this.connectionId}`);
  }

  async loadCookies(page: Page): Promise<boolean> {
    const session = await loadSession(this.connectionId);
    if (!session) return false;
    await page.setCookie(...session.cookies);
    await page.setUserAgent(session.userAgent);
    console.log(`🍪 Çerezler Supabase'den yüklendi.`);
    return true;
  }

  async clearCookies(): Promise<void> {
    await deleteSession(this.connectionId);
  }

  abstract loginAndGetSession(page: Page): Promise<Page>;
  abstract scrapeAccountSnapshot(page: Page): Promise<any>;
}