import fs from 'node:fs/promises';
import path from 'node:path';
import type { BankConfig, ResolvedBankConfig } from '../scrapers/types.js';

interface BanksFile { banks: BankConfig[] }

export async function loadBanksConfig(): Promise<ResolvedBankConfig[]> {
  const configPath = path.resolve(process.cwd(), 'automation/config/banks_config.json');
  const parsed = JSON.parse(await fs.readFile(configPath, 'utf8')) as BanksFile;

  return parsed.banks.filter((bank) => bank.enabled).map((bank) => {
    const username = process.env[bank.usernameEnv];
    const password = process.env[bank.passwordEnv];
    if (!username) throw new Error(`${bank.id}: ${bank.usernameEnv} is missing`);
    if (!password) throw new Error(`${bank.id}: ${bank.passwordEnv} is missing`);

    return {
      ...bank,
      username,
      password,
      cookieFile: path.resolve(process.cwd(), 'automation/cookies', `cookies_${bank.id}.json`)
    };
  });
}
