import { createClient } from '@supabase/supabase-js';
import type { AccountSnapshot, ScrapedTransaction } from '../scrapers/types.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_BACKEND_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_BACKEND_KEY) throw new Error('SUPABASE_URL and a backend Supabase key are required');

const supabase = createClient(SUPABASE_URL, SUPABASE_BACKEND_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export async function writeAudit(action: string, detail: string, severity = 'info') {
  const { error } = await supabase.from('audit_logs').insert({ actor_label: 'automation', action, resource_type: 'scraper', detail, severity });
  if (error) console.error('audit log failed:', error.message);
}

export async function notify(message: string) {
  const telegram = process.env.TELEGRAM_WEBHOOK_URL;
  const discord = process.env.DISCORD_WEBHOOK_URL;
  if (discord) await fetch(discord, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: message }) }).catch(() => null);
  if (telegram) await fetch(telegram, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: message }) }).catch(() => null);
}

// ✅ EXPORT eklendi + provider parametresi opsiyonel snapshot oldu
export async function ensureConnection(provider: string, snapshot?: Partial<AccountSnapshot>) {
  const now = new Date().toISOString();
  const { data: existing, error: findError } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('provider', provider)
    .maybeSingle();
  if (findError) throw findError;

  const institutionName = snapshot?.bankName || provider;

  if (existing) {
    const { data, error } = await supabase
      .from('bank_connections')
      .update({ institution_name: institutionName, status: 'connected', last_sync_at: now, updated_at: now })
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
      institution_name: institutionName,
      status: 'connected',
      scopes: ['accounts', 'balances', 'transactions'],
      last_sync_at: now
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

// ✅ EXPORT eklendi
export async function ensureAccount(connectionId: string, snapshot: AccountSnapshot) {
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
    const { data, error } = await supabase.from('bank_accounts').update(payload).eq('id', existing.id).select('*').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('bank_accounts').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

// ✅ EXPORT eklendi
export async function persistTransactions(accountId: string, transactions: ScrapedTransaction[] = []) {
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
      const { error } = await supabase.from('transactions').upsert(payload, { onConflict: 'external_ref' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
    }
  }
}

export async function persistSnapshot(snapshot: AccountSnapshot, providerId: string) {
  const connection = await ensureConnection(providerId, snapshot);
  const account = await ensureAccount(connection.id, snapshot);
  await persistTransactions(account.id, snapshot.transactions);
  return account;
}