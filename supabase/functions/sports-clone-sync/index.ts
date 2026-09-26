import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const slugify = (value: string) =>
  value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type NormalizedSport = {
  externalId?: string;
  key: string;
  name: string;
  category?: string;
  metadata?: Record<string, unknown>;
};
type NormalizedLeague = { externalId: string; name: string; sport?: string; country?: string; logoUrl?: string; metadata?: Record<string, unknown> };
type NormalizedTeam = { externalId: string; name: string; sport?: string; country?: string; logoUrl?: string; metadata?: Record<string, unknown> };
type NormalizedFixture = {
  externalId: string; sport?: string; leagueExternalId?: string; homeTeamExternalId?: string; awayTeamExternalId?: string;
  startsAt: string; status?: "scheduled"|"live"|"paused"|"finished"|"postponed"|"cancelled";
  minute?: number|null; homeScore?: number; awayScore?: number; venue?: string|null; providerUpdatedAt?: string|null;
  metadata?: Record<string, unknown>;
};
type NormalizedEvent = {
  externalId: string; fixtureExternalId: string; eventType: string; minute?: number|null; teamExternalId?: string|null;
  participantName?: string|null; detail?: string|null; occurredAt?: string|null; metadata?: Record<string, unknown>;
};
type EntityType = "sport"|"league"|"team"|"fixture";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase server configuration missing" }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Authentication required" }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: "Invalid session" }, 401);

  const { data: profile } = await admin.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin" || profile.active === false) return json({ error: "Admin access required" }, 403);

  const resolveMapping = async (providerId: string, entityType: EntityType, externalId?: string|null) => {
    if (!externalId) return null;
    const { data } = await admin.from("sports_provider_mappings")
      .select("internal_id").eq("provider_id", providerId).eq("entity_type", entityType).eq("external_id", externalId).maybeSingle();
    return data?.internal_id ?? null;
  };

  const queueUnmapped = async (
    providerId:string,
    entityType:EntityType,
    externalId:string,
    externalName:string|null,
    reason:string,
    payload:Record<string,unknown>,
  ) => {
    await admin.from("sports_unmapped_entities").upsert({
      provider_id:providerId,
      entity_type:entityType,
      external_id:externalId,
      external_name:externalName,
      reason,
      payload,
      status:"open",
    }, { onConflict:"provider_id,entity_type,external_id,reason" });
  };

  const markResolved = async (providerId:string,entityType:EntityType,externalId:string,internalId:string) => {
    await admin.from("sports_unmapped_entities").update({
      status:"resolved",
      resolved_internal_id:internalId,
      resolved_at:new Date().toISOString(),
    }).eq("provider_id",providerId).eq("entity_type",entityType).eq("external_id",externalId).eq("status","open");
  };

  if (req.method === "GET") {
    const [providers, sports, fixtures, live, runs, unmapped] = await Promise.all([
      admin.from("sports_providers").select("*", { count: "exact", head: true }),
      admin.from("sports_catalog").select("*", { count: "exact", head: true }).eq("active", true),
      admin.from("sports_fixtures").select("*", { count: "exact", head: true }),
      admin.from("sports_fixtures").select("*", { count: "exact", head: true }).eq("status", "live"),
      admin.from("sports_sync_runs").select("*", { count: "exact", head: true }).eq("status", "failed"),
      admin.from("sports_unmapped_entities").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);
    return json({
      ok: true,
      counts: {
        providers: providers.count ?? 0,
        sports: sports.count ?? 0,
        fixtures: fixtures.count ?? 0,
        live: live.count ?? 0,
        failedSyncs: runs.count ?? 0,
        unmapped: unmapped.count ?? 0,
      },
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "override_fixture") {
    const fixtureId = String(body.fixtureId || "");
    const reason = body.reason ? String(body.reason) : null;
    const changes = body.changes && typeof body.changes === "object" ? body.changes as Record<string, unknown> : {};
    const allowed = new Set(["status","minute","home_score","away_score","starts_at","venue"]);
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(changes)) if (allowed.has(key)) patch[key] = value;
    if (!fixtureId || !Object.keys(patch).length) return json({ error: "fixtureId and supported changes are required" }, 400);

    const { data: current, error: currentError } = await admin.from("sports_fixtures").select("*").eq("id", fixtureId).single();
    if (currentError || !current) return json({ error: "Fixture not found" }, 404);

    const overrideRows = Object.entries(patch).map(([field, value]) => ({
      fixture_id: fixtureId,
      field_name: field,
      previous_value: current[field] === undefined ? null : current[field],
      override_value: value,
      reason,
      created_by: user.id,
    }));
    const { error: overrideError } = await admin.from("sports_admin_overrides").insert(overrideRows);
    if (overrideError) return json({ error: overrideError.message }, 500);

    const { data: updated, error: updateError } = await admin.from("sports_fixtures")
      .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", fixtureId).select().single();
    if (updateError) return json({ error: updateError.message }, 500);

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      user_id: user.id,
      actor_label: user.email || "admin",
      action: "sports_fixture_override",
      resource_type: "sports_fixture",
      resource_id: fixtureId,
      detail: "Sports fixture updated from admin console",
      severity: "warning",
      metadata: { changes: patch, reason },
    });
    return json({ ok: true, fixture: updated });
  }

  if (action === "resolve_unmapped") {
    const unmappedId=String(body.unmappedId||"");
    const internalId=String(body.internalId||"");
    if(!unmappedId||!internalId) return json({error:"unmappedId and internalId required"},400);
    const {data:item,error:itemError}=await admin.from("sports_unmapped_entities").select("*").eq("id",unmappedId).single();
    if(itemError||!item) return json({error:"Unmapped entity not found"},404);
    await admin.from("sports_provider_mappings").upsert({
      provider_id:item.provider_id,
      entity_type:item.entity_type,
      external_id:item.external_id,
      internal_id:internalId,
      external_name:item.external_name,
      match_method:"manual",
      confidence:1,
      verified:true,
      updated_at:new Date().toISOString(),
    },{onConflict:"provider_id,entity_type,external_id"});
    await markResolved(item.provider_id,item.entity_type as EntityType,item.external_id,internalId);
    return json({ok:true});
  }

  if (action !== "ingest") return json({ error: "Unsupported action" }, 400);

  const providerInput = body.provider || {};
  const providerKey = String(providerInput.key || "").trim();
  const providerName = String(providerInput.name || providerKey).trim();
  if (!providerKey || !providerName) return json({ error: "provider.key and provider.name are required" }, 400);

  const sportsInput = Array.isArray(body.sports) ? body.sports as NormalizedSport[] : [];
  const leagues = Array.isArray(body.leagues) ? body.leagues as NormalizedLeague[] : [];
  const teams = Array.isArray(body.teams) ? body.teams as NormalizedTeam[] : [];
  const fixtures = Array.isArray(body.fixtures) ? body.fixtures as NormalizedFixture[] : [];
  const events = Array.isArray(body.events) ? body.events as NormalizedEvent[] : [];

  const discoveredSports = new Map<string, NormalizedSport>();
  const addSport = (value?:string|null,name?:string|null) => {
    const raw=(value||name||"").trim();
    if(!raw)return;
    const key=slugify(raw);
    if(!key)return;
    if(!discoveredSports.has(key)) discoveredSports.set(key,{key,name:name||raw});
  };
  for(const sport of sportsInput){
    const key=slugify(sport.key||sport.name);
    if(key) discoveredSports.set(key,{...sport,key,name:sport.name||sport.key});
  }
  for(const row of leagues)addSport(row.sport);
  for(const row of teams)addSport(row.sport);
  for(const row of fixtures)addSport(row.sport);

  const sports=[...discoveredSports.values()];
  const received = sports.length + leagues.length + teams.length + fixtures.length + events.length;

  const { data: provider, error: providerError } = await admin.from("sports_providers").upsert({
    provider_key: providerKey,
    name: providerName,
    mode: providerInput.mode || "api",
    base_url: providerInput.baseUrl || null,
    active: true,
    metadata: providerInput.metadata || {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider_key" }).select().single();
  if (providerError || !provider) return json({ error: providerError?.message || "Provider upsert failed" }, 500);

  const { data: run, error: runError } = await admin.from("sports_sync_runs").insert({
    provider_id: provider.id,
    trigger_type: body.triggerType || "api",
    status: "running",
    items_received: received,
  }).select().single();
  if (runError || !run) return json({ error: runError?.message || "Sync run could not start" }, 500);

  let upserted = 0;
  let unresolved = 0;
  const sportMap = new Map<string,string>();
  const leagueMap = new Map<string, string>();
  const teamMap = new Map<string, string>();
  const fixtureMap = new Map<string, string>();

  try {
    for (const item of sports) {
      const sportKey=slugify(item.key||item.name);
      if(!sportKey)continue;
      const {data,error}=await admin.from("sports_catalog").upsert({
        sport_key:sportKey,
        name:item.name||item.key,
        category:item.category||"sport",
        active:true,
        metadata:item.metadata||{},
        updated_at:new Date().toISOString(),
      },{onConflict:"sport_key"}).select().single();
      if(error||!data)throw error||new Error("Sport catalog upsert failed");
      sportMap.set(sportKey,data.id);
      const externalId=item.externalId||sportKey;
      await admin.from("sports_provider_mappings").upsert({
        provider_id:provider.id,
        entity_type:"sport",
        external_id:externalId,
        internal_id:data.id,
        external_name:item.name||item.key,
        match_method:"external_id",
        confidence:1,
        verified:true,
        updated_at:new Date().toISOString(),
      },{onConflict:"provider_id,entity_type,external_id"});
      await markResolved(provider.id,"sport",externalId,data.id);
      upserted++;
    }

    for (const item of leagues) {
      if (!item.externalId || !item.name) continue;
      const sport = slugify(item.sport || "football") || "football";
      let sportId=sportMap.get(sport)||await resolveMapping(provider.id,"sport",sport);
      if(!sportId){
        const {data}=await admin.from("sports_catalog").select("id").eq("sport_key",sport).maybeSingle();
        sportId=data?.id||null;
      }
      const { data, error } = await admin.from("sports_leagues").upsert({
        sport, sport_id:sportId, name: item.name, slug: slugify(item.name), country: item.country || null,
        logo_url: item.logoUrl || null, metadata: item.metadata || {}, updated_at: new Date().toISOString(),
      }, { onConflict: "sport,slug" }).select().single();
      if (error || !data) throw error || new Error("League upsert failed");
      leagueMap.set(item.externalId, data.id);
      await admin.from("sports_provider_mappings").upsert({
        provider_id: provider.id, entity_type: "league", external_id: item.externalId, internal_id: data.id,
        external_name: item.name, match_method: "external_id", confidence: 1, verified: true, updated_at: new Date().toISOString(),
      }, { onConflict: "provider_id,entity_type,external_id" });
      await markResolved(provider.id,"league",item.externalId,data.id);
      upserted++;
    }

    for (const item of teams) {
      if (!item.externalId || !item.name) continue;
      const sport = slugify(item.sport || "football") || "football";
      let sportId=sportMap.get(sport)||await resolveMapping(provider.id,"sport",sport);
      if(!sportId){
        const {data}=await admin.from("sports_catalog").select("id").eq("sport_key",sport).maybeSingle();
        sportId=data?.id||null;
      }
      const { data, error } = await admin.from("sports_teams").upsert({
        sport, sport_id:sportId, name: item.name, slug: slugify(item.name), country: item.country || null,
        logo_url: item.logoUrl || null, metadata: item.metadata || {}, updated_at: new Date().toISOString(),
      }, { onConflict: "sport,slug" }).select().single();
      if (error || !data) throw error || new Error("Team upsert failed");
      teamMap.set(item.externalId, data.id);
      await admin.from("sports_provider_mappings").upsert({
        provider_id: provider.id, entity_type: "team", external_id: item.externalId, internal_id: data.id,
        external_name: item.name, match_method: "external_id", confidence: 1, verified: true, updated_at: new Date().toISOString(),
      }, { onConflict: "provider_id,entity_type,external_id" });
      await markResolved(provider.id,"team",item.externalId,data.id);
      upserted++;
    }

    for (const item of fixtures) {
      if (!item.externalId || !item.startsAt) continue;
      const sport=slugify(item.sport||"football")||"football";
      let sportId=sportMap.get(sport)||await resolveMapping(provider.id,"sport",sport);
      if(!sportId){
        const {data}=await admin.from("sports_catalog").select("id").eq("sport_key",sport).maybeSingle();
        sportId=data?.id||null;
      }
      const leagueId = leagueMap.get(item.leagueExternalId || "") || await resolveMapping(provider.id, "league", item.leagueExternalId);
      const homeTeamId = teamMap.get(item.homeTeamExternalId || "") || await resolveMapping(provider.id, "team", item.homeTeamExternalId);
      const awayTeamId = teamMap.get(item.awayTeamExternalId || "") || await resolveMapping(provider.id, "team", item.awayTeamExternalId);

      if(item.leagueExternalId&&!leagueId){
        unresolved++;
        await queueUnmapped(provider.id,"league",item.leagueExternalId,null,"fixture_league_mapping_missing",item.metadata||{});
      }
      if(item.homeTeamExternalId&&!homeTeamId){
        unresolved++;
        await queueUnmapped(provider.id,"team",item.homeTeamExternalId,null,"fixture_home_team_mapping_missing",item.metadata||{});
      }
      if(item.awayTeamExternalId&&!awayTeamId){
        unresolved++;
        await queueUnmapped(provider.id,"team",item.awayTeamExternalId,null,"fixture_away_team_mapping_missing",item.metadata||{});
      }

      const { data, error } = await admin.from("sports_fixtures").upsert({
        provider_id: provider.id, external_id: item.externalId, sport, sport_id:sportId,
        league_id: leagueId, home_team_id: homeTeamId, away_team_id: awayTeamId, starts_at: item.startsAt,
        status: item.status || "scheduled", minute: item.minute ?? null, home_score: item.homeScore ?? 0,
        away_score: item.awayScore ?? 0, venue: item.venue ?? null,
        last_provider_update_at: item.providerUpdatedAt || new Date().toISOString(),
        metadata: item.metadata || {}, updated_at: new Date().toISOString(),
      }, { onConflict: "provider_id,external_id" }).select().single();
      if (error || !data) throw error || new Error("Fixture upsert failed");
      fixtureMap.set(item.externalId, data.id);
      await admin.from("sports_provider_mappings").upsert({
        provider_id: provider.id, entity_type: "fixture", external_id: item.externalId, internal_id: data.id,
        external_name: null, match_method: "external_id", confidence: 1, verified: true, updated_at: new Date().toISOString(),
      }, { onConflict: "provider_id,entity_type,external_id" });
      await markResolved(provider.id,"fixture",item.externalId,data.id);
      upserted++;
    }

    for (const item of events) {
      const fixtureId = fixtureMap.get(item.fixtureExternalId) || await resolveMapping(provider.id, "fixture", item.fixtureExternalId);
      if (!fixtureId) {
        unresolved++;
        if(item.fixtureExternalId) await queueUnmapped(provider.id,"fixture",item.fixtureExternalId,null,"event_fixture_mapping_missing",item.metadata||{});
        continue;
      }
      if (!item.externalId || !item.eventType) continue;
      const teamId = teamMap.get(item.teamExternalId || "") || await resolveMapping(provider.id, "team", item.teamExternalId);
      const { error } = await admin.from("sports_fixture_events").upsert({
        fixture_id: fixtureId, provider_event_id: item.externalId, event_type: item.eventType,
        minute: item.minute ?? null, team_id: teamId, participant_name: item.participantName ?? null,
        detail: item.detail ?? null, occurred_at: item.occurredAt ?? null, metadata: item.metadata || {},
      }, { onConflict: "fixture_id,provider_event_id" });
      if (error) throw error;
      upserted++;
    }

    const finishedAt = new Date().toISOString();
    const checkpoint=body.checkpoint&&typeof body.checkpoint==="object"?body.checkpoint:{};
    const pageNumber=Number((checkpoint as Record<string,unknown>).page||0);
    const cursorValue=(checkpoint as Record<string,unknown>).nextCursor;
    await admin.from("sports_sync_state").upsert({
      provider_id:provider.id,
      cursor:typeof cursorValue==="string"?cursorValue:null,
      page_number:Number.isFinite(pageNumber)?pageNumber:0,
      checkpoint,
      last_incremental_sync_at:body.fullSync?null:finishedAt,
      last_full_sync_at:body.fullSync?finishedAt:null,
      updated_at:finishedAt,
    },{onConflict:"provider_id"});

    await admin.from("sports_sync_runs").update({
      status: unresolved ? "partial" : "completed",
      items_upserted: upserted,
      completed_at: finishedAt,
      summary: {
        sports:sports.length,
        leagues: leagues.length,
        teams: teams.length,
        fixtures: fixtures.length,
        events: events.length,
        unresolved,
        checkpoint,
      },
    }).eq("id", run.id);
    await admin.from("sports_providers").update({ last_sync_at: finishedAt, updated_at: finishedAt }).eq("id", provider.id);
    await admin.from("audit_logs").insert({
      actor_id: user.id, user_id: user.id, actor_label: user.email || "admin", action: "sports_provider_sync",
      resource_type: "sports_provider", resource_id: provider.id, detail: "Sports catalog and fixtures synchronized",
      severity: unresolved ? "warning" : "success",
      metadata: { providerKey, received, upserted, unresolved, syncRunId: run.id, checkpoint },
    });
    return json({ ok: true, providerId: provider.id, syncRunId: run.id, received, upserted, unresolved });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from("sports_sync_runs").update({
      status: "failed", items_upserted: upserted, error_message: message, completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return json({ error: message, syncRunId: run.id, upserted, unresolved }, 500);
  }
});
