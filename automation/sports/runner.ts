import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { HttpJsonSportsAdapter } from './providerAdapter'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_USER_JWT
const endpoint = process.env.SPORTS_PROVIDER_URL
const providerKey = process.env.SPORTS_PROVIDER_KEY || 'sports-provider'
const providerName = process.env.SPORTS_PROVIDER_NAME || 'Sports Provider'
const providerToken = process.env.SPORTS_PROVIDER_TOKEN
const pageSize = Number(process.env.SPORTS_PROVIDER_PAGE_SIZE || 500)
const maxPages = Number(process.env.SPORTS_PROVIDER_MAX_PAGES || 200)
const cursorParam = process.env.SPORTS_PROVIDER_CURSOR_PARAM || 'cursor'
const pageParam = process.env.SPORTS_PROVIDER_PAGE_PARAM || 'page'
const pageSizeParam = process.env.SPORTS_PROVIDER_PAGE_SIZE_PARAM || 'limit'

if (!url || !key || !endpoint) throw new Error('SUPABASE_URL, SUPABASE_USER_JWT and SPORTS_PROVIDER_URL are required')

const adapter = new HttpJsonSportsAdapter(
  providerKey,
  providerName,
  endpoint,
  providerToken ? { authorization: 'Bearer ' + providerToken } : {},
  { pageSize,maxPages,cursorParam,pageParam,pageSizeParam },
)
const envelope = await adapter.fetchAll(maxPages)
const supabase = createClient(url, key, { auth:{ persistSession:false, autoRefreshToken:false } })

const sports = envelope.sports || []
const leagues = envelope.leagues || []
const teams = envelope.teams || []
const fixtures = envelope.fixtures || []
const events = envelope.events || []
const batchSize = Number(process.env.SPORTS_INGEST_BATCH_SIZE || 500)

const chunks = <T>(rows:T[]) => {
  const out:T[][]=[]
  for(let i=0;i<rows.length;i+=batchSize) out.push(rows.slice(i,i+batchSize))
  return out
}

const leagueChunks=chunks(leagues)
const teamChunks=chunks(teams)
const fixtureChunks=chunks(fixtures)
const eventChunks=chunks(events)
const total=Math.max(leagueChunks.length,teamChunks.length,fixtureChunks.length,eventChunks.length,1)

for(let i=0;i<total;i++){
  const { data, error } = await supabase.functions.invoke('sports-clone-sync', {
    body:{
      action:'ingest',
      provider:envelope.provider,
      sports:i===0?sports:[],
      leagues:leagueChunks[i]||[],
      teams:teamChunks[i]||[],
      fixtures:fixtureChunks[i]||[],
      events:eventChunks[i]||[],
      triggerType:'scheduled',
      fullSync:i===total-1,
      checkpoint:{...(envelope.checkpoint||{}),batch:i+1,totalBatches:total},
    },
  })
  if (error) throw error
  console.log(JSON.stringify(data))
}
