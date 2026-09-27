import {useCallback,useEffect,useMemo,useState} from 'react'
import {supabase} from './supabase'

export type GameProvider={id:string;provider_key:string;name:string;provider_type:string;catalog_url:string|null;active:boolean;last_sync_at:string|null;metadata:Record<string,unknown>;created_at:string;updated_at:string}
export type GameCatalogItem={id:string;provider_id:string|null;external_id:string|null;name:string;slug:string;game_type:string;category:string|null;thumbnail_url:string|null;demo_launch_url:string|null;certified_rtp:number|null;volatility:string;max_multiplier:number|null;enabled:boolean;maintenance:boolean;featured:boolean;sort_order:number;provider_updated_at:string|null;metadata:Record<string,unknown>;created_at:string;updated_at:string}
export type GameSyncRun={id:string;provider_id:string|null;trigger_type:string;status:string;items_received:number;items_upserted:number;error_message:string|null;summary:Record<string,unknown>;started_at:string;completed_at:string|null}
export type GameMapping={id:string;provider_id:string;external_id:string;internal_game_id:string;external_name:string|null;verified:boolean;created_at:string;updated_at:string}

export function useGameCatalog(){
  const[providers,setProviders]=useState<GameProvider[]>([])
  const[games,setGames]=useState<GameCatalogItem[]>([])
  const[syncRuns,setSyncRuns]=useState<GameSyncRun[]>([])
  const[mappings,setMappings]=useState<GameMapping[]>([])
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState<string|null>(null)

  const load=useCallback(async()=>{
    if(!supabase){setError('Supabase is not configured');setLoading(false);return}
    setLoading(true);setError(null)
    const[p,g,s,m]=await Promise.all([
      supabase.from('game_providers').select('*').order('name'),
      supabase.from('game_catalog').select('*').order('sort_order').order('name').limit(10000),
      supabase.from('game_sync_runs').select('*').order('started_at',{ascending:false}).limit(200),
      supabase.from('game_provider_mappings').select('*').order('updated_at',{ascending:false}).limit(10000),
    ])
    const failures=[p,g,s].filter(x=>x.error).map(x=>x.error!.message)
    if(failures.length)setError(failures[0])
    setProviders((p.data||[]) as GameProvider[])
    setGames((g.data||[]) as GameCatalogItem[])
    setSyncRuns((s.data||[]) as GameSyncRun[])
    setMappings((m.data||[]) as GameMapping[])
    setLoading(false)
  },[])

  useEffect(()=>{
    void load()
    if(!supabase)return
    const channel=supabase.channel('game-catalog-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'game_catalog'},()=>void load())
      .subscribe()
    return()=>{if(supabase)void supabase.removeChannel(channel)}
  },[load])

  const providerById=useMemo(()=>new Map(providers.map(x=>[x.id,x])),[providers])
  return{providers,games,syncRuns,mappings,providerById,loading,error,reload:load}
}

export async function ingestGameCatalog(payload:Record<string,unknown>){
  if(!supabase)throw new Error('Supabase is not configured')
  const{data,error}=await supabase.functions.invoke('game-catalog-sync',{body:{action:'ingest_catalog',...payload}})
  if(error)throw error
  return data
}

export async function updateGameAdmin(gameId:string,changes:Record<string,unknown>){
  if(!supabase)throw new Error('Supabase is not configured')
  const{data,error}=await supabase.functions.invoke('game-catalog-sync',{body:{action:'update_game_admin',gameId,changes}})
  if(error)throw error
  return data
}

export async function bulkGameVisibility(gameIds:string[],changes:{enabled?:boolean;maintenance?:boolean}){
  if(!supabase)throw new Error('Supabase is not configured')
  const{data,error}=await supabase.functions.invoke('game-catalog-sync',{body:{action:'bulk_visibility',gameIds,...changes}})
  if(error)throw error
  return data
}
