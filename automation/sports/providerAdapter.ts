import type { ProviderEnvelope, SportsProviderAdapter } from './types'
import { normalizeSportsEnvelope } from './normalizer'

type AdapterOptions = {
  cursorParam?: string
  pageParam?: string
  pageSizeParam?: string
  pageSize?: number
  maxPages?: number
}

const mergeUnique = <T>(target:T[], source:T[], key:(row:T)=>string) => {
  const map = new Map(target.map(row=>[key(row),row]))
  for (const row of source) map.set(key(row),row)
  return [...map.values()]
}

export class HttpJsonSportsAdapter implements SportsProviderAdapter {
  private options:Required<AdapterOptions>

  constructor(
    public key: string,
    public name: string,
    private endpoint: string,
    private headers: Record<string,string> = {},
    options:AdapterOptions = {},
  ) {
    this.options = {
      cursorParam: options.cursorParam || 'cursor',
      pageParam: options.pageParam || 'page',
      pageSizeParam: options.pageSizeParam || 'limit',
      pageSize: options.pageSize || 500,
      maxPages: options.maxPages || 200,
    }
  }

  private async fetchPage(page:number,cursor?:string|null):Promise<ProviderEnvelope>{
    const url = new URL(this.endpoint)
    url.searchParams.set(this.options.pageSizeParam,String(this.options.pageSize))
    if(cursor) url.searchParams.set(this.options.cursorParam,cursor)
    else url.searchParams.set(this.options.pageParam,String(page))

    const response = await fetch(url, { headers: { accept: 'application/json', ...this.headers } })
    if (!response.ok) throw new Error('Sports provider HTTP ' + response.status)
    const payload = await response.json() as ProviderEnvelope
    return normalizeSportsEnvelope({
      ...payload,
      provider: { ...(payload.provider || {}), key:this.key, name:this.name, mode:'api', baseUrl:this.endpoint },
    })
  }

  async fetchSnapshot(): Promise<ProviderEnvelope> {
    return this.fetchPage(1,null)
  }

  async fetchAll(maxPages=this.options.maxPages):Promise<ProviderEnvelope>{
    let page=1
    let cursor:string|null|undefined=null
    let out:ProviderEnvelope={
      provider:{key:this.key,name:this.name,mode:'api',baseUrl:this.endpoint},
      sports:[],leagues:[],teams:[],fixtures:[],events:[],
      triggerType:'scheduled',fullSync:true,
    }

    while(page<=maxPages){
      const current=await this.fetchPage(page,cursor)
      out.sports=mergeUnique(out.sports||[],current.sports||[],x=>x.externalId||x.key)
      out.leagues=mergeUnique(out.leagues||[],current.leagues||[],x=>x.externalId)
      out.teams=mergeUnique(out.teams||[],current.teams||[],x=>x.externalId)
      out.fixtures=mergeUnique(out.fixtures||[],current.fixtures||[],x=>x.externalId)
      out.events=mergeUnique(out.events||[],current.events||[],x=>x.externalId)

      const next=current.pagination?.nextCursor
      const hasMore=current.pagination?.hasMore === true || Boolean(next)
      out.checkpoint={page,nextCursor:next||null}

      if(!hasMore) break
      cursor=next || null
      page += 1
    }

    return normalizeSportsEnvelope(out)
  }
}
