import { GarantiScraper } from './GarantiScraper.js';
import { BankBScraper } from './BankBScraper.js';
import banksConfig from '../config/banks_config.json' assert { type: 'json' };

export function scraperFactory(bankId: string, connectionId: string, credentials: any) {
  const config = (banksConfig as any).banks.find((b: any) => b.id === bankId);
  if (!config) throw new Error(`Bilinmeyen banka: ${bankId}`);

  switch (bankId) {
    case 'tr:garanti':
      return new GarantiScraper({ ...config, ...credentials }, connectionId);
    case 'tr:bankb':
      return new BankBScraper({ ...config, ...credentials }, connectionId);
    default:
      throw new Error(`Adapter bulunamadı: ${bankId}`);
  }
}