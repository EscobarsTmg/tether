import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { HttpJsonSportsAdapter } from './providerAdapter'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_USER_JWT
const endpoint = process.env.SPORTS_PROVIDER_URL
const providerKey = process.env.SPORTS_PROVIDER_KEY || 'sports-provider'
const providerName = process.env.SPORTS_PROVIDER_NAME || 'Sports Provider'
const providerToken = process.env.SPORTS_PROVIDER_TOKEN

if (!url || !key || !endpoint) throw new Error('SUPABASE_URL, SUPABASE_USER_JWT and SPORTS_PROVIDER_URL are required')

const adapter = new HttpJsonSportsAdapter(
  providerKey,
  providerName,
  endpoint,
  providerToken ? { authorization: 'Bearer ' + providerToken } : {},
)
const envelope = await adapter.fetchSnapshot()
const supabase = createClient(url, key, { auth:{ persistSession:false, autoRefreshToken:false } })
const { data, error } = await supabase.functions.invoke('sports-clone-sync', { body:{ action:'ingest', ...envelope, triggerType:'scheduled' } })
if (error) throw error
console.log(JSON.stringify(data, null, 2))
