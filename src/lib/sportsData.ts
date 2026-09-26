import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

export type SportsProvider={id:string;provider_key:string;name:string;mode:string;base_url:string|null;active:boolean;last_sync_at:string|null;metadata:Record<string,unknown>;created_at:string;updated_at:string}
export type SportsLeague={id:string;sport:string;name:string;slug:string;country:string|null;logo_url:string|null;active:boolean}
export type SportsTeam={id:string;sport:string;name:string;slug:string;country:string|null;logo_url:string|null;active:boolean}
export type SportsFixture={id:string;provider_id:string|null;external_id:string|null;sport:string;league_id:string|null;home_team_id:string|null;away_team_id:string|null;starts_at:string;status:string;minute:number|null;home_score:number;away_score:number;venue:string|null;last_provider_update_at:string|null;metadata:Record<string,unknown>;updated_at:string}
export type SportsEvent={id:string;fixture_id:string;provider_event_id:string|null;event_type:string;minute:number|null;team_id:string|null;participant_name:string|null;detail:string|null;occurred_at:string|null;created_at:string}
export type SportsSyncRun={id:string;provider_id:string|null;trigger_type:string;status:string;items_received:number;items_upserted:number;error_message:string|null;summary:Record<string,unknown>;started_at:string;completed_at:string|null}
export type SportsMapping={id:string;provider_id:string;entity_type:string;external_id:string;internal_id:string;external_name:string|null;match_method:string;confidence:number|null;verified:boolean;updated_at:string}

export function useSportsData(){
  const[providers,setProviders]=useState<SportsProvider[]>([])
  const[leagues,setLeagues]=useState<SportsLeague[]>([])
  const[teams,setTeams]=useState<SportsTeam[]>([])
  const[fixtures,setFixtures]=useState<SportsFixture[]>([])
  const[events,setEvents]=useState<SportsEvent[]>([])
  const[syncRuns,setSyncRuns]=useState<SportsSyncRun[]>([])
  const[mappings,setMappings]=useState<SportsMapping[]>([])
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState<string|null>(null)

  const load=useCallback(async()=>{
    if(!supabase){setError('Supabase is not configured');setLoading(false);return}
    setLoading(true);setError(null)
    const [p,l,t,f,e,s,m]=await Promise.all([
      supabase.from('sports_providers').select('*').order('name'),
      supabase.from('sports_leagues').select('*').order('name'),
      supabase.from('sports_teams').select('*').order('name'),
      supabase.from('sports_fixtures').select('*').order('starts_at',{ascending:true}).limit(1000),
      supabase.from('sports_fixture_events').select('*').order('created_at',{ascending:false}).limit(500),
      supabase.from('sports_sync_runs').select('*').order('started_at',{ascending:false}).limit(100),
      supabase.from('sports_provider_mappings').select('*').order('updated_at',{ascending:false}).limit(500),
    ])
    const failures=[p,l,t,f,e,s].filter(x=>x.error).map(x=>x.error!.message)
    if(failures.length)setError(failures[0])
    setProviders((p.data||[]) as SportsProvider[])
    setLeagues((l.data||[]) as SportsLeague[])
    setTeams((t.data||[]) as SportsTeam[])
    setFixtures((f.data||[]) as SportsFixture[])
    setEvents((e.data||[]) as SportsEvent[])
    setSyncRuns((s.data||[]) as SportsSyncRun[])
    setMappings((m.data||[]) as SportsMapping[])
    setLoading(false)
  },[])

  useEffect(()=>{
    void load()
    if(!supabase)return
    const channel=supabase.channel('sports-data-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'sports_fixtures'},()=>void load())
      .on('postgres_changes',{event:'*',schema:'public',table:'sports_fixture_events'},()=>void load())
      .subscribe()
    return()=>{if(supabase)void supabase.removeChannel(channel)}
  },[load])

  const leagueById=useMemo(()=>new Map(leagues.map(x=>[x.id,x])),[leagues])
  const teamById=useMemo(()=>new Map(teams.map(x=>[x.id,x])),[teams])
  const providerById=useMemo(()=>new Map(providers.map(x=>[x.id,x])),[providers])
  return{providers,leagues,teams,fixtures,events,syncRuns,mappings,leagueById,teamById,providerById,loading,error,reload:load}
}

export async function ingestSportsPayload(payload:Record<string,unknown>){
  if(!supabase)throw new Error('Supabase is not configured')
  const {data,error}=await supabase.functions.invoke('sports-clone-sync',{body:{action:'ingest',...payload}})
  if(error)throw error
  return data
}

export async function overrideSportsFixture(fixtureId:string,changes:Record<string,unknown>,reason?:string){
  if(!supabase)throw new Error('Supabase is not configured')
  const {data,error}=await supabase.functions.invoke('sports-clone-sync',{body:{action:'override_fixture',fixtureId,changes,reason}})
  if(error)throw error
  return data
}
