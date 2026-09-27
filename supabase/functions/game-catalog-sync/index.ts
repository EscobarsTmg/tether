import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const slugify=(value:string)=>value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

type GameType="slot"|"live_casino"|"table"|"instant"|"virtual"|"other";
type GameInput={
  externalId:string; name:string; type?:GameType; category?:string|null; thumbnailUrl?:string|null;
  demoLaunchUrl?:string|null; certifiedRtp?:number|null; volatility?:"low"|"medium"|"high"|"unknown";
  maxMultiplier?:number|null; providerUpdatedAt?:string|null; metadata?:Record<string,unknown>;
};

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey)return json({error:"Supabase server configuration missing"},500);

  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token)return json({error:"Authentication required"},401);

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(token);
  const user=userData.user;
  if(userError||!user)return json({error:"Invalid session"},401);

  const {data:profile}=await admin.from("profiles").select("role,active").eq("id",user.id).maybeSingle();
  if(!profile||profile.role!=="admin"||profile.active===false)return json({error:"Admin access required"},403);

  if(req.method==="GET"){
    const [providers,games,enabled,maintenance,runs]=await Promise.all([
      admin.from("game_providers").select("*",{count:"exact",head:true}),
      admin.from("game_catalog").select("*",{count:"exact",head:true}),
      admin.from("game_catalog").select("*",{count:"exact",head:true}).eq("enabled",true),
      admin.from("game_catalog").select("*",{count:"exact",head:true}).eq("maintenance",true),
      admin.from("game_sync_runs").select("*",{count:"exact",head:true}).eq("status","failed"),
    ]);
    return json({ok:true,counts:{
      providers:providers.count??0,games:games.count??0,enabled:enabled.count??0,
      maintenance:maintenance.count??0,failedSyncs:runs.count??0,
    }});
  }

  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");

  if(action==="update_game_admin"){
    const gameId=String(body.gameId||"");
    const changes=body.changes&&typeof body.changes==="object"?body.changes as Record<string,unknown>:{};
    const allowed=new Set(["enabled","maintenance","featured","category","sort_order"]);
    const patch:Record<string,unknown>={};
    for(const [key,value] of Object.entries(changes))if(allowed.has(key))patch[key]=value;
    if(!gameId||!Object.keys(patch).length)return json({error:"gameId and supported changes are required"},400);

    const {data:current,error:currentError}=await admin.from("game_catalog").select("*").eq("id",gameId).single();
    if(currentError||!current)return json({error:"Game not found"},404);

    const {data:updated,error:updateError}=await admin.from("game_catalog")
      .update({...patch,updated_at:new Date().toISOString()}).eq("id",gameId).select().single();
    if(updateError)return json({error:updateError.message},500);

    await admin.from("audit_logs").insert({
      actor_id:user.id,user_id:user.id,actor_label:user.email||"admin",
      action:"game_catalog_admin_update",resource_type:"game_catalog",resource_id:gameId,
      detail:"Game catalog presentation state updated",severity:"info",
      metadata:{changes:patch,before:{
        enabled:current.enabled,maintenance:current.maintenance,featured:current.featured,
        category:current.category,sort_order:current.sort_order,
      }},
    });
    return json({ok:true,game:updated});
  }

  if(action==="bulk_visibility"){
    const ids=Array.isArray(body.gameIds)?body.gameIds.map(String).filter(Boolean):[];
    const enabled=typeof body.enabled==="boolean"?body.enabled:null;
    const maintenance=typeof body.maintenance==="boolean"?body.maintenance:null;
    const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
    if(enabled!==null)patch.enabled=enabled;
    if(maintenance!==null)patch.maintenance=maintenance;
    if(!ids.length||Object.keys(patch).length===1)return json({error:"gameIds and enabled/maintenance are required"},400);
    const {error}=await admin.from("game_catalog").update(patch).in("id",ids);
    if(error)return json({error:error.message},500);
    await admin.from("audit_logs").insert({
      actor_id:user.id,user_id:user.id,actor_label:user.email||"admin",
      action:"game_catalog_bulk_visibility",resource_type:"game_catalog",resource_id:null,
      detail:"Bulk game visibility state updated",severity:"info",metadata:{gameIds:ids,changes:patch},
    });
    return json({ok:true,updated:ids.length});
  }

  if(action!=="ingest_catalog")return json({error:"Unsupported action"},400);
  const providerInput=body.provider||{};
  const providerKey=String(providerInput.key||"").trim();
  const providerName=String(providerInput.name||providerKey).trim();
  if(!providerKey||!providerName)return json({error:"provider.key and provider.name are required"},400);

  const games=Array.isArray(body.games)?body.games as GameInput[]:[];
  const {data:provider,error:providerError}=await admin.from("game_providers").upsert({
    provider_key:providerKey,name:providerName,provider_type:providerInput.type||"api",
    catalog_url:providerInput.catalogUrl||null,active:true,metadata:providerInput.metadata||{},
    updated_at:new Date().toISOString(),
  },{onConflict:"provider_key"}).select().single();
  if(providerError||!provider)return json({error:providerError?.message||"Provider upsert failed"},500);

  const {data:run,error:runError}=await admin.from("game_sync_runs").insert({
    provider_id:provider.id,trigger_type:body.triggerType||"api",status:"running",items_received:games.length,
  }).select().single();
  if(runError||!run)return json({error:runError?.message||"Sync run could not start"},500);

  let upserted=0;
  try{
    for(const item of games){
      if(!item.externalId||!item.name)continue;
      const rtp=item.certifiedRtp==null?null:Number(item.certifiedRtp);
      const multiplier=item.maxMultiplier==null?null:Number(item.maxMultiplier);
      const {data:game,error}=await admin.from("game_catalog").upsert({
        provider_id:provider.id,external_id:String(item.externalId),name:String(item.name),
        slug:slugify(String(item.name)),game_type:item.type||"other",category:item.category||null,
        thumbnail_url:item.thumbnailUrl||null,demo_launch_url:item.demoLaunchUrl||null,
        certified_rtp:Number.isFinite(rtp as number)?rtp:null,volatility:item.volatility||"unknown",
        max_multiplier:Number.isFinite(multiplier as number)?multiplier:null,
        provider_updated_at:item.providerUpdatedAt||new Date().toISOString(),metadata:item.metadata||{},
        updated_at:new Date().toISOString(),
      },{onConflict:"provider_id,external_id"}).select().single();
      if(error||!game)throw error||new Error("Game upsert failed");

      await admin.from("game_provider_mappings").upsert({
        provider_id:provider.id,external_id:String(item.externalId),internal_game_id:game.id,
        external_name:String(item.name),verified:true,updated_at:new Date().toISOString(),
      },{onConflict:"provider_id,external_id"});
      upserted++;
    }

    const finishedAt=new Date().toISOString();
    await admin.from("game_sync_runs").update({
      status:"completed",items_upserted:upserted,completed_at:finishedAt,
      summary:{games:games.length,upserted},
    }).eq("id",run.id);
    await admin.from("game_providers").update({last_sync_at:finishedAt,updated_at:finishedAt}).eq("id",provider.id);
    await admin.from("audit_logs").insert({
      actor_id:user.id,user_id:user.id,actor_label:user.email||"admin",
      action:"game_catalog_sync",resource_type:"game_provider",resource_id:provider.id,
      detail:"Game provider catalog synchronized",severity:"success",
      metadata:{providerKey,received:games.length,upserted,syncRunId:run.id},
    });
    return json({ok:true,providerId:provider.id,syncRunId:run.id,received:games.length,upserted});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await admin.from("game_sync_runs").update({
      status:"failed",items_upserted:upserted,error_message:message,completed_at:new Date().toISOString(),
    }).eq("id",run.id);
    return json({error:message,syncRunId:run.id,upserted},500);
  }
});
