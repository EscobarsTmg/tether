import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type ImportedRow = {
  occurred_at: string;
  description?: string;
  counterparty?: string;
  amount: number;
  balance_after?: number | null;
  currency?: string;
  external_id?: string;
};

function parseCsv(text: string): ImportedRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase());
  const indexOf = (...names: string[]) => headers.findIndex((h) => names.includes(h));

  const dateIdx = indexOf("date", "tarih", "booking_date", "transaction_date");
  const amountIdx = indexOf("amount", "tutar", "transaction_amount");
  const descIdx = indexOf("description", "açıklama", "aciklama", "details", "memo");
  const balanceIdx = indexOf("balance", "bakiye", "balance_after");
  const currencyIdx = indexOf("currency", "para birimi", "döviz", "doviz");
  const idIdx = indexOf("id", "transaction_id", "reference", "referans");

  if (dateIdx < 0 || amountIdx < 0) {
    throw new Error("CSV must contain date/tarih and amount/tutar columns");
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(separator).map((c) => c.trim().replace(/^\"|\"$/g, ""));
    const amount = Number(String(cols[amountIdx] ?? "0").replace(/\./g, "").replace(",", "."));
    const balanceRaw = balanceIdx >= 0 ? cols[balanceIdx] : undefined;
    const balance = balanceRaw == null || balanceRaw === ""
      ? null
      : Number(String(balanceRaw).replace(/\./g, "").replace(",", "."));

    const d = new Date(cols[dateIdx]);
    if (!Number.isFinite(amount) || Number.isNaN(d.getTime())) return null;

    return {
      occurred_at: d.toISOString(),
      description: descIdx >= 0 ? cols[descIdx] : undefined,
      counterparty: descIdx >= 0 ? cols[descIdx] : undefined,
      amount,
      balance_after: Number.isFinite(balance as number) ? balance : null,
      currency: currencyIdx >= 0 ? (cols[currencyIdx] || undefined) : undefined,
      external_id: idIdx >= 0 ? (cols[idIdx] || undefined) : `csv-${i}-${d.getTime()}-${amount}`,
    } satisfies ImportedRow;
  }).filter(Boolean) as ImportedRow[];
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "unauthorized" }, 401);

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const { data: profile } = await client
    .from("profiles")
    .select("role,full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "reviewer"].includes(profile.role)) {
    return json({ error: "forbidden" }, 403);
  }

  const body = await req.json().catch(() => ({})) as {
    account_id?: string;
    csv_text?: string;
    default_currency?: string;
  };

  if (!body.account_id) return json({ error: "account_id_required" }, 400);
  if (!body.csv_text) return json({ error: "csv_text_required" }, 400);

  const { data: account, error: accountError } = await client
    .from("bank_accounts")
    .select("id,currency,bank_name,account_name")
    .eq("id", body.account_id)
    .maybeSingle();

  if (accountError || !account) return json({ error: "account_not_found" }, 404);

  let rows: ImportedRow[];
  try {
    rows = parseCsv(body.csv_text);
  } catch (e) {
    return json({ error: "csv_parse_failed", detail: e instanceof Error ? e.message : String(e) }, 400);
  }

  if (!rows.length) return json({ error: "no_valid_rows" }, 400);
  if (rows.length > 5000) return json({ error: "too_many_rows", limit: 5000 }, 400);

  const payload = rows.map((r) => ({
    account_id: account.id,
    provider_transaction_id: r.external_id,
    occurred_at: r.occurred_at,
    direction: r.amount >= 0 ? "deposit" : "withdrawal",
    method: "statement_import",
    counterparty: r.counterparty || r.description || null,
    amount: Math.abs(r.amount),
    balance_after: r.balance_after ?? null,
    status: "completed",
  }));

  const { error: insertError } = await client
    .from("transactions")
    .upsert(payload, { onConflict: "account_id,provider_transaction_id", ignoreDuplicates: true });

  if (insertError) {
    return json({ error: "transaction_import_failed", detail: insertError.message }, 400);
  }

  await client.from("audit_logs").insert({
    actor_id: user.id,
    actor_label: profile.full_name || user.email || "operator",
    action: "bank_statement_imported",
    resource_type: "bank_account",
    resource_id: account.id,
    detail: `Imported ${payload.length} statement rows for ${account.bank_name} ${account.account_name}`,
    severity: "info",
  }).catch(() => null);

  return json({ ok: true, imported: payload.length });
});
