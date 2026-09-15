import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const allowedScopes = new Set(["accounts", "balances", "transactions"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return json({ error: "unauthorized" }, 401);

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role,full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) return json({ error: "profile_lookup_failed" }, 500);
    if (!profile || !["admin", "reviewer"].includes(profile.role)) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => null) as {
      provider?: unknown;
      institution_name?: unknown;
      scopes?: unknown;
    } | null;

    if (!body) return json({ error: "invalid_json" }, 400);

    const provider = String(body.provider ?? "").trim().toLowerCase();
    const institutionName = String(body.institution_name ?? "").trim();

    // Supports namespaced provider IDs such as tr:garanti while rejecting URLs and whitespace.
    if (!/^[a-z0-9][a-z0-9:_-]{1,63}$/.test(provider)) return json({ error: "invalid_provider" }, 400);
    if (!institutionName || institutionName.length > 120) return json({ error: "invalid_institution_name" }, 400);

    const requestedScopes = Array.isArray(body.scopes) ? body.scopes.map(String) : ["accounts", "balances", "transactions"];
    const scopes = [...new Set(requestedScopes.filter((scope) => allowedScopes.has(scope)))];
    if (!scopes.length) return json({ error: "invalid_scopes" }, 400);

    const { data: existing, error: lookupError } = await client
      .from("bank_connections")
      .select("id,status")
      .eq("provider", provider)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) return json({ error: "connection_lookup_failed", detail: lookupError.message }, 400);

    let connection;
    if (existing) {
      const { data, error } = await client
        .from("bank_connections")
        .update({ institution_name: institutionName, scopes })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) return json({ error: "connection_update_failed", detail: error.message }, 400);
      connection = data;
    } else {
      const { data, error } = await client
        .from("bank_connections")
        .insert({ provider, institution_name: institutionName, status: "pending", scopes, created_by: user.id })
        .select("*")
        .single();
      if (error) return json({ error: "connection_register_failed", detail: error.message }, 400);
      connection = data;
    }

    await client.from("audit_logs").insert({
      actor_id: user.id,
      actor_label: profile.full_name || user.email || "operator",
      action: existing ? "bank_connection_updated" : "bank_connection_registered",
      resource_type: "bank_connection",
      resource_id: connection.id,
      detail: `${existing ? "Updated" : "Registered"} ${provider} connection for ${institutionName}`,
      severity: "info",
    }).catch(() => null);

    return json({
      ok: true,
      connection,
      message: existing ? "Connection updated." : "Connection created.",
    }, existing ? 200 : 201);
  } catch (error) {
    return json({ error: "internal_error", detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
