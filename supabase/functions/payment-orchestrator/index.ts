import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenBankingAdapter } from "../_shared/open-banking-adapter.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const IN_PROGRESS = new Set(["awaiting_user_auth", "submitted", "processing"]);

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

  const body = await req.json().catch(() => ({})) as { payment_request_id?: string; return_url?: string };
  if (!body.payment_request_id) return json({ error: "payment_request_id_required" }, 400);

  const { data: payment, error: paymentError } = await client.from("payment_requests").select("*").eq("id", body.payment_request_id).maybeSingle();
  if (paymentError || !payment) return json({ error: "payment_request_not_found" }, 404);

  if (IN_PROGRESS.has(payment.status) || payment.provider_payment_id) {
    return json({ ok: true, code: "ALREADY_SUBMITTED", payment_request_id: payment.id, status: payment.status, provider_payment_id: payment.provider_payment_id || null, message: "This payment request has already entered the provider flow and will not be submitted twice." }, 200);
  }
  if (payment.status !== "draft") return json({ error: "invalid_payment_state", status: payment.status }, 409);

  const { data: account } = await client.from("bank_accounts").select("id,status,withdrawals_enabled,provider_account_id,connection_id").eq("id", payment.account_id).maybeSingle();
  if (!account) return json({ error: "account_not_found" }, 404);
  if (account.status !== "active") return json({ error: "account_not_active" }, 409);
  if (!account.withdrawals_enabled) return json({ error: "withdrawals_disabled" }, 409);
  if (!account.provider_account_id) return json({ error: "provider_account_missing" }, 409);

  const { data: connection } = await client.from("bank_connections").select("id,provider,status,provider_connection_id").eq("id", account.connection_id).maybeSingle();
  if (!connection) return json({ error: "connection_not_found" }, 404);
  if (connection.status !== "connected" || !connection.provider_connection_id) return json({ error: "connection_not_connected" }, 409);

  const returnUrl = body.return_url || Deno.env.get("PAYMENT_RETURN_URL");
  if (!returnUrl) return json({ error: "return_url_required" }, 400);

  const adapter = createOpenBankingAdapter(connection.provider);

  try {
    const result = await adapter.initiatePayment({
      externalConnectionId: connection.provider_connection_id,
      providerAccountId: account.provider_account_id,
      amount: Number(payment.amount),
      currency: payment.currency,
      destinationIban: payment.destination_iban,
      destinationName: payment.destination_name || "Beneficiary",
      description: payment.description || undefined,
      returnUrl,
    });

    const { error: updateError } = await admin.from("payment_requests").update({
      provider_payment_id: result.providerPaymentId,
      status: result.status,
      authorization_url: result.authorizationUrl ?? null,
      submitted_at: new Date().toISOString(),
    }).eq("id", payment.id);
    if (updateError) throw updateError;

    await admin.from("audit_logs").insert({ actor_id: user.id, actor_label: profile.full_name || user.email || "operator", action: "payment_provider_flow_started", resource_type: "payment_request", resource_id: payment.id, detail: `Provider payment ${result.providerPaymentId} entered state ${result.status}`, severity: "info" }).catch(() => null);

    return json({ ok: true, payment_request_id: payment.id, provider_payment_id: result.providerPaymentId, status: result.status, authorization_url: result.authorizationUrl ?? null }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "payment_initiation_failed";
    await admin.from("payment_requests").update({ status: "error", provider_error: message }).eq("id", payment.id).catch(() => null);
    return json({ ok: false, error: "payment_initiation_failed", detail: message }, 502);
  }
});
