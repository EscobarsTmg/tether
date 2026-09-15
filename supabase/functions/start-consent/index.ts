import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenBankingAdapter } from "../_shared/open-banking-adapter.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

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

  const body = await req.json().catch(() => ({})) as { connection_id?: string; return_url?: string };
  if (!body.connection_id) return json({ error: "connection_id_required" }, 400);

  const { data: connection, error } = await client.from("bank_connections").select("id,provider,status").eq("id", body.connection_id).maybeSingle();
  if (error || !connection) return json({ error: "connection_not_found" }, 404);

  const returnUrl = body.return_url || Deno.env.get("OPEN_BANKING_CALLBACK_URL");
  if (!returnUrl) return json({ error: "return_url_required" }, 400);

  try {
    const adapter = createOpenBankingAdapter(connection.provider);
    const consent = await adapter.createConsent(returnUrl);

    const { error: updateError } = await admin.from("bank_connections").update({
      status: "pending",
      consent_state: consent.state,
      authorization_url: consent.authorizationUrl,
      sync_error: null,
    }).eq("id", connection.id);
    if (updateError) throw updateError;

    await admin.from("audit_logs").insert({ actor_id: user.id, actor_label: profile.full_name || user.email || "operator", action: "open_banking_consent_started", resource_type: "bank_connection", resource_id: connection.id, detail: `Consent started for ${connection.provider}`, severity: "info" }).catch(() => null);

    return json({ ok: true, connection_id: connection.id, authorization_url: consent.authorizationUrl, state: consent.state });
  } catch (consentError) {
    const message = consentError instanceof Error ? consentError.message : "consent_start_failed";
    await admin.from("bank_connections").update({ status: "error", sync_error: message }).eq("id", connection.id).catch(() => null);
    return json({ ok: false, error: "consent_start_failed", detail: message }, 502);
  }
});
