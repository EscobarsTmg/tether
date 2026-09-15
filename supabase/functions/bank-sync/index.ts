import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenBankingAdapter } from "../_shared/open-banking-adapter.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const SYNC_COOLDOWN_MS = 60_000;
const PAGE_GUARD = 1000;
const PAGE_DELAY_MS = 200;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "unauthorized" }, 401);

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const { data: profile } = await client.from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "reviewer"].includes(profile.role)) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({})) as { connection_id?: string };
  if (!body.connection_id) return json({ error: "connection_id_required" }, 400);

  const { data: connection, error } = await client.from("bank_connections").select("*").eq("id", body.connection_id).maybeSingle();
  if (error || !connection) return json({ error: "connection_not_found" }, 404);
  if (connection.status !== "connected") return json({ error: "connection_not_connected", status: connection.status }, 409);
  if (!connection.provider_connection_id) return json({ error: "provider_connection_missing" }, 409);

  const lastSync = connection.last_sync_at ? new Date(connection.last_sync_at).getTime() : 0;
  const remaining = SYNC_COOLDOWN_MS - (Date.now() - lastSync);
  if (lastSync && remaining > 0) {
    return json({ ok: false, code: "SYNC_COOLDOWN", retry_after_ms: remaining, message: "Sync was requested too recently. Retry after the cooldown window." }, 429);
  }

  const adapter = createOpenBankingAdapter(connection.provider);
  let accountCount = 0;
  let transactionCount = 0;

  try {
    const accounts = await adapter.listAccounts(connection.provider_connection_id);

    for (const account of accounts) {
      const { data: storedAccount, error: accountError } = await admin.from("bank_accounts").upsert({
        connection_id: connection.id,
        provider_account_id: account.providerAccountId,
        bank_name: account.bankName,
        account_name: account.accountName,
        iban_masked: account.ibanMasked,
        currency: account.currency,
        balance: account.balance,
        status: account.status,
      }, { onConflict: "connection_id,provider_account_id" }).select("id").single();

      if (accountError || !storedAccount) throw accountError ?? new Error("account_upsert_failed");
      accountCount += 1;

      let cursor: string | undefined;
      let page = 0;
      do {
        if (page >= PAGE_GUARD) throw new Error("transaction_cursor_guard_exceeded");
        const batch = await adapter.listTransactions(connection.provider_connection_id, account.providerAccountId, cursor);
        if (batch.items.length) {
          const rows = batch.items.map((transaction) => ({
            connection_id: connection.id,
            account_id: storedAccount.id,
            provider_transaction_id: transaction.providerTransactionId,
            occurred_at: transaction.occurredAt,
            direction: transaction.direction,
            method: transaction.method,
            counterparty: transaction.counterparty ?? null,
            counterparty_iban_masked: transaction.counterpartyIbanMasked ?? null,
            amount: transaction.amount,
            balance_after: transaction.balanceAfter ?? null,
            status: transaction.status,
            raw: transaction,
            synced_at: new Date().toISOString(),
          }));
          const { error: txError } = await admin.from("bank_transactions").upsert(rows, { onConflict: "provider_transaction_id" });
          if (txError) throw txError;
          transactionCount += rows.length;
        }
        cursor = batch.nextCursor;
        page += 1;
        if (cursor) await sleep(PAGE_DELAY_MS);
      } while (cursor);
    }

    await admin.from("bank_connections").update({ last_sync_at: new Date().toISOString(), sync_error: null }).eq("id", connection.id);
    await admin.from("audit_logs").insert({ actor_id: user.id, actor_label: profile.full_name || user.email || "operator", action: "bank_sync_completed", resource_type: "bank_connection", resource_id: connection.id, detail: `Synced ${accountCount} accounts and ${transactionCount} transactions`, severity: "info" }).catch(() => null);

    return json({ ok: true, connection_id: connection.id, accounts: accountCount, transactions: transactionCount });
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "bank_sync_failed";
    await admin.from("bank_connections").update({ sync_error: message }).eq("id", connection.id).catch(() => null);
    await admin.from("audit_logs").insert({ actor_id: user.id, actor_label: profile.full_name || user.email || "operator", action: "bank_sync_failed", resource_type: "bank_connection", resource_id: connection.id, detail: message, severity: "warning" }).catch(() => null);
    return json({ ok: false, error: "bank_sync_failed", detail: message }, 502);
  }
});
