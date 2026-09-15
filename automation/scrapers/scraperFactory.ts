import type { BankScraper, ResolvedBankConfig } from './types.js';
import { BankAScraper } from './BankAScraper.js';
import { BankBScraper } from './BankBScraper.js';

export function createScraper(config: ResolvedBankConfig): BankScraper {
  switch (config.scraper) {
    case 'bankA': return new BankAScraper(config);
    case 'bankB': return new BankBScraper(config);
    default: throw new Error(`Unknown scraper adapter: ${config.scraper}`);
  }
}
