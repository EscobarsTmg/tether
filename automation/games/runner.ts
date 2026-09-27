import 'dotenv/config'
import {createClient} from '@supabase/supabase-js'
import {HttpJsonGameCatalogAdapter} from './providerAdapter'
const url=process.env.SUPABASE_URL
const key=process.env.SUPABASE_USER_JWT
const endpoint=process.env.GAME_PROVIDER_URL
const providerKey=process.env.GAME_PROVIDER_KEY||'game-provider'
const providerName=process.env.GAME_PROVIDER_NAME||'Game Provider'
const providerToken=process.env.GAME_PROVIDER_TOKEN
if(!url||!key||!endpoint)throw new Error('SUPABASE_URL, SUPABASE_USER_JWT and GAME_PROVIDER_URL are required')
const adapter=new HttpJsonGameCatalogAdapter(providerKey,providerName,endpoint,providerToken?{authorization:'Bearer '+providerToken}:{})
const envelope=await adapter.fetchCatalog()
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {data,error}=await supabase.functions.invoke('game-catalog-sync',{body:{action:'ingest_catalog',...envelope,triggerType:'scheduled'}})
if(error)throw error
console.log(JSON.stringify(data,null,2))
