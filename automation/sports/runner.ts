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
const batchSize = Number(process.env.SPORTS_INGEST_BATCH_SIZE || 500)

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

const chunks = <T>(rows:T[]) => {
  const out:T[][]=[]
  for(let i=0;i<rows.length;i+=batchSize) out.push(rows.slice(i,i+batchSize))
  return out
}

const invoke = async (body:Record<string,unknown>) => {
  const { data, error } = await supabase.functions.invoke('sports-clone-sync', { body:{action:'ingest',provider:envelope.provider,triggerType:'scheduled',...body} })
  if (error) throw error
  console.log(JSON.stringify(data))
}

const catalogBatches=Math.max(chunks(envelope.leagues||[]).length,chunks(envelope.teams||[]).length,1)
const leagueChunks=chunks(envelope.leagues||[])
const teamChunks=chunks(envelope.teams||[])

for(let i=0;i<catalogBatches;i++){
  await invoke({
    sports:i===0?(envelope.sports||[]):[],
    leagues:leagueChunks[i]||[],
    teams:teamChunks[i]||[],
    fixtures:[],
    events:[],
    fullSync:false,
    checkpoint:{phase:'catalog',batch:i+1,totalBatches:catalogBatches,...(envelope.checkpoint||{})},
  })
}

const fixtureChunks=chunks(envelope.fixtures||[])
for(let i=0;i<fixtureChunks.length;i++){
  await invoke({
    sports:[],leagues:[],teams:[],fixtures:fixtureChunks[i],events:[],
    fullSync:false,
    checkpoint:{phase:'fixtures',batch:i+1,totalBatches:fixtureChunks.length,...(envelope.checkpoint||{})},
  })
}

const eventChunks=chunks(envelope.events||[])
for(let i=0;i<eventChunks.length;i++){
  await invoke({
    sports:[],leagues:[],teams:[],fixtures:[],events:eventChunks[i],
    fullSync:false,
    checkpoint:{phase:'events',batch:i+1,totalBatches:eventChunks.length,...(envelope.checkpoint||{})},
  })
}

await invoke({
  sports:[],leagues:[],teams:[],fixtures:[],events:[],
  fullSync:true,
  checkpoint:{phase:'complete',...(envelope.checkpoint||{})},
})
