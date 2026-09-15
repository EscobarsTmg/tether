import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const backendKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !backendKey) {
  throw new Error('SUPABASE_URL and a backend Supabase key are required');
}

const supabase = createClient(supabaseUrl, backendKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

type Rule = {
  accountId: string;
  threshold: number;
  amount: number;
  currency: string;
  destinationName: string;
  destinationIbanMasked: string;
  description?: string;
};

const rules: Rule[] = [
  {
    accountId: process.env.RULE_ACCOUNT_ID || '',
    threshold: Number(process.env.RULE_MIN_BALANCE || '10000'),
    amount: Number(process.env.RULE_TRANSFER_AMOUNT || '1000'),
    currency: process.env.RULE_CURRENCY || 'TRY',
    destinationName: process.env.RULE_DESTINATION_NAME || 'Placeholder Recipient',
    destinationIbanMasked: process.env.RULE_DESTINATION_IBAN_MASKED || 'TR** **** **** **** **** **** **',
    description: process.env.RULE_DESCRIPTION || 'Automation draft'
  }
].filter(rule => rule.accountId);

async function audit(action: string, detail: string, severity: 'info'|'success'|'warning'|'error' = 'info') {
  const { error } = await supabase.from('audit_logs').insert({
    actor_label: 'automation',
    action,
    resource_type: 'rule_engine',
    detail,
    severity
  });
  if (error) console.error('audit log failed:', error.message);
}

async function recentDuplicate(accountId: string, amount: number, destinationName: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('payment_requests')
    .select('id')
    .eq('account_id', accountId)
    .eq('amount', amount)
    .eq('destination_name', destinationName)
    .in('status', ['pending_approval', 'approved'])
    .gte('created_at', since)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function runRuleEngine() {
  if (!rules.length) {
    await audit('rule_engine_skipped', 'No RULE_ACCOUNT_ID configured', 'warning');
    return { processed: 0, created: 0 };
  }

  let created = 0;

  for (const rule of rules) {
    try {
      const { data: account, error } = await supabase
        .from('bank_accounts')
        .select('id,balance,currency,status,withdrawals_enabled')
        .eq('id', rule.accountId)
        .single();

      if (error || !account) {
        await audit('rule_skipped', `Account not found: ${rule.accountId}`, 'warning');
        continue;
      }

      if (!['active', 'connected'].includes(String(account.status).toLowerCase())) {
        await audit('rule_skipped', `Account ${account.id} is not active`, 'warning');
        continue;
      }

      if (!account.withdrawals_enabled) {
        await audit('rule_skipped', `Account ${account.id} withdrawals are disabled`, 'warning');
        continue;
      }

      if (account.currency !== rule.currency) {
        await audit('rule_skipped', `Currency mismatch for ${account.id}`, 'warning');
        continue;
      }

      const balance = Number(account.balance || 0);
      if (balance < rule.threshold || balance < rule.amount) {
        await audit('rule_skipped', `Balance threshold not met for ${account.id}`);
        continue;
      }

      if (await recentDuplicate(account.id, rule.amount, rule.destinationName)) {
        await audit('rule_skipped', `Recent duplicate request detected for ${account.id}`);
        continue;
      }

      const { data: request, error: requestError } = await supabase
        .from('payment_requests')
        .insert({
          account_id: account.id,
          direction: 'transfer',
          amount: rule.amount,
          currency: rule.currency,
          destination_iban_masked: rule.destinationIbanMasked,
          destination_name: rule.destinationName,
          description: rule.description || null,
          status: 'pending_approval'
        })
        .select('id')
        .single();

      if (requestError) throw requestError;
      created += 1;
      await audit('payment_request_created', `Created pending approval request ${request.id}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await audit('rule_failed', message, 'error');
    }
  }

  return { processed: rules.length, created };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRuleEngine().catch(() => process.exit(1));
}
