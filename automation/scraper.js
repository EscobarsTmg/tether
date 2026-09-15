import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BANK_START_URL = process.env.BANK_START_URL || 'https://example-bank.invalid';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function writeAudit(action, detail, severity = 'info') {
  await supabase.from('audit_logs').insert({
    actor_label: 'automation',
    action,
    resource_type: 'scraper',
    detail,
    severity
  });
}

async function notify(message) {
  const telegram = process.env.TELEGRAM_WEBHOOK_URL;
  const discord = process.env.DISCORD_WEBHOOK_URL;
  const payload = { content: message };

  if (discord) {
    await fetch(discord, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => null);
  }

  if (telegram) {
    await fetch(telegram, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: message })
    }).catch(() => null);
  }
}

async function loginAndGetSession(page) {
  // TODO: Kullanıcı burayı kendi banka bilgilerine göre dolduracak
  // Bu iskelet giriş, 2FA, cookie/session persistence veya bot koruması aşma kodu içermez.
  return page;
}

async function scrapeAccountSnapshot(page) {
  // TODO: Banka HTML yapısına göre doldurulacak
  // Örnek çıktı biçimi korunmalıdır.
  return {
    bankName: 'Placeholder Bank',
    accountName: 'Placeholder Account',
    accountNumberMasked: '****0000',
    currency: 'TRY',
    balance: 0,
    transactions: []
  };
}

async function persistSnapshot(snapshot) {
  const { data: connection, error: connectionError } = await supabase
    .from('bank_connections')
    .upsert({
      provider: 'scraper-placeholder',
      institution_name: snapshot.bankName,
      status: 'connected',
      last_sync_at: new Date().toISOString()
    }, { onConflict: 'provider' })
    .select()
    .single();

  if (connectionError) throw connectionError;

  const { data: account, error: accountError } = await supabase
    .from('bank_accounts')
    .upsert({
      connection_id: connection.id,
      provider_account_id: snapshot.accountNumberMasked,
      bank_name: snapshot.bankName,
      account_name: snapshot.accountName,
      iban_masked: snapshot.accountNumberMasked,
      currency: snapshot.currency,
      balance: snapshot.balance,
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'connection_id,provider_account_id' })
    .select()
    .single();

  if (accountError) throw accountError;

  for (const tx of snapshot.transactions) {
    const amount = Number(tx.amount || 0);
    await supabase.from('transactions').upsert({
      external_ref: tx.externalRef || null,
      account_id: account.id,
      occurred_at: tx.occurredAt || new Date().toISOString(),
      direction: amount >= 0 ? 'deposit' : 'withdrawal',
      method: tx.method || 'scraped',
      counterparty: tx.counterparty || null,
      counterparty_iban_masked: tx.counterpartyIbanMasked || null,
      amount,
      balance_after: tx.balanceAfter ?? null,
      status: tx.status || 'completed'
    }, { onConflict: 'external_ref' });
  }

  return account;
}

export async function runScraper() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(BANK_START_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await loginAndGetSession(page);
    const snapshot = await scrapeAccountSnapshot(page);
    const account = await persistSnapshot(snapshot);
    await writeAudit('scrape_completed', `Account ${account.id} synchronized`);
    return account;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeAudit('scrape_failed', message, 'error');
    await notify(`Bank automation failed: ${message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runScraper().catch(() => process.exit(1));
}
