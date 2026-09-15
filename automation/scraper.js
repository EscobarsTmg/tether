import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_BACKEND_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BANK_START_URL = process.env.BANK_START_URL || '';

if (!SUPABASE_URL || !SUPABASE_BACKEND_KEY) {
  throw new Error('SUPABASE_URL and a backend Supabase key are required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_BACKEND_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function writeAudit(action, detail, severity = 'info') {
  const { error } = await supabase.from('audit_logs').insert({
    actor_label: 'automation',
    action,
    resource_type: 'scraper',
    detail,
    severity
  });
  if (error) console.error('audit log failed:', error.message);
}

async function notify(message) {
  const telegram = process.env.TELEGRAM_WEBHOOK_URL;
  const discord = process.env.DISCORD_WEBHOOK_URL;

  if (discord) {
    await fetch(discord, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: message })
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
  // Giriş, 2FA, cookie persistence ve bot koruması aşma kodu bu iskelette yoktur.
  return page;
}

async function scrapeAccountSnapshot(page) {
  // TODO: Kullanıcı dolduracak
  // TODO: Banka HTML yapısına göre doldurulacak
  return {
    bankName: 'Placeholder Bank',
    accountName: 'Placeholder Account',
    accountNumberMasked: '****0000',
    currency: 'TRY',
    balance: 0,
    transactions: []
  };
}

async function ensureConnection(snapshot) {
  const provider = process.env.BANK_PROVIDER_ID || 'scraper-placeholder';
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('provider', provider)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from('bank_connections')
      .update({
        institution_name: snapshot.bankName,
        status: 'connected',
        last_sync_at: now,
        updated_at: now
      })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('bank_connections')
    .insert({
      provider,
      institution_name: snapshot.bankName,
      status: 'connected',
      scopes: ['accounts', 'balances', 'transactions'],
      last_sync_at: now
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

async function ensureAccount(connectionId, snapshot) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('provider_connection_id', connectionId)
    .eq('provider_account_id', snapshot.accountNumberMasked)
    .maybeSingle();

  if (findError) throw findError;

  const payload = {
    provider_connection_id: connectionId,
    provider_account_id: snapshot.accountNumberMasked,
    bank_name: snapshot.bankName,
    account_name: snapshot.accountName,
    iban_masked: snapshot.accountNumberMasked,
    currency: snapshot.currency,
    balance: Number(snapshot.balance || 0),
    deposits_enabled: true,
    withdrawals_enabled: true,
    status: 'active',
    updated_at: now
  };

  if (existing) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function persistTransactions(accountId, transactions = []) {
  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    const externalRef = tx.externalRef || null;
    const payload = {
      external_ref: externalRef,
      account_id: accountId,
      occurred_at: tx.occurredAt || new Date().toISOString(),
      direction: amount >= 0 ? 'deposit' : 'withdrawal',
      method: tx.method || 'scraped',
      counterparty: tx.counterparty || null,
      counterparty_iban_masked: tx.counterpartyIbanMasked || null,
      amount,
      balance_after: tx.balanceAfter ?? null,
      status: tx.status || 'completed',
      metadata: tx.metadata || {}
    };

    if (externalRef) {
      const { error } = await supabase
        .from('transactions')
        .upsert(payload, { onConflict: 'external_ref' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
    }
  }
}

async function persistSnapshot(snapshot) {
  const connection = await ensureConnection(snapshot);
  const account = await ensureAccount(connection.id, snapshot);
  await persistTransactions(account.id, snapshot.transactions);
  return account;
}

export async function runScraper() {
  if (!BANK_START_URL) {
    await writeAudit('scrape_skipped', 'BANK_START_URL is not configured', 'warning');
    return { skipped: true, reason: 'BANK_START_URL missing' };
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

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
