import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenBankingAdapter } from "../_shared/open-banking-adapter.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const parseInput = async (req: Request): Promise<{ code?: string; state?: string }> => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    return { code: url.searchParams.get("code") ?? undefined, state: url.searchParams.get("state") ?? undefined };
  }
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await req.json().catch(() => ({})) as { code?: string; state?: string };
  }
  const form = await req.formData();
  return {
    code: String(form.get("code") ?? "") || undefined,
    state: String(form.get("state") ?? "") || undefined,
  };
};

Deno.serve(async (req: Request) => {
  if (!['GET','POST'].includes(req.method)) return json({ error: "method_not_allowed" }, 405);

  const frontend = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { code, state } = await parseInput(req);
    if (!code || !state) return json({ error: "missing_code_or_state" }, 400);

    const { data: connection, error } = await admin.from("bank_connections").select("id,provider,status,consent_state").eq("consent_state", state).maybeSingle();
    if (error || !connection) return json({ error: "invalid_state" }, 400);
    if (connection.consent_state !== state) return json({ error: "state_mismatch" }, 400);

    const adapter = createOpenBankingAdapter(connection.provider);
    const result = await adapter.exchangeAuthorization(code, state);

    const { error: updateError } = await admin.from("bank_connections").update({
      provider_connection_id: result.externalConnectionId,
      consent_expires_at: result.consentExpiresAt ?? null,
      consent_state: null,
      authorization_url: null,
      status: "connected",
      last_sync_at: null,
      sync_error: null,
    }).eq("id", connection.id);
    if (updateError) throw updateError;

    const redirect = new URL("/", frontend);
    redirect.searchParams.set("open_banking", "connected");
    redirect.searchParams.set("connection_id", connection.id);
    return Response.redirect(redirect.toString(), 302);
  } catch (error) {
    const redirect = new URL("/", frontend);
    redirect.searchParams.set("open_banking", "error");
    redirect.searchParams.set("message", error instanceof Error ? error.message : "unknown_error");
    return Response.redirect(redirect.toString(), 302);
  }
});
