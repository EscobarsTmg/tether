import puppeteer from 'puppeteer';
import { loadBanksConfig } from './config/loadBanksConfig.js';
import { createScraper } from './scrapers/scraperFactory.js';
import { notify, persistSnapshot, writeAudit } from './persistence/bankPersistence.js';

export async function runScraper() {
  const banks = await loadBanksConfig();
  if (!banks.length) {
    await writeAudit('scrape_skipped', 'No enabled banks configured', 'warning');
    return [];
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results: Array<Record<string, unknown>> = [];

  try {
    for (const bank of banks) {
      const page = await browser.newPage();
      try {
        const scraper = createScraper(bank);
        await writeAudit('bank_scrape_started', `Starting ${bank.id}`);
        await scraper.openStartPage(page);
        await scraper.loginAndGetSession(page);
        const snapshot = await scraper.scrapeAccountSnapshot(page);
        const account = await persistSnapshot(snapshot, bank.providerId);
        results.push({ bankId: bank.id, success: true, account });
        await writeAudit('bank_scrape_completed', `${bank.id}: account ${account.id} synchronized`, 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ bankId: bank.id, success: false, error: message });
        await writeAudit('bank_scrape_failed', `${bank.id}: ${message}`, 'error');
        await notify(`Bank automation failed [${bank.id}]: ${message}`);
      } finally {
        await page.close();
      }
    }
    return results;
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runScraper().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
