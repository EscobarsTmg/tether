import type {GameCatalogEnvelope,GameCatalogProviderAdapter} from './types'
import {normalizeGameCatalog} from './normalizer'
export class HttpJsonGameCatalogAdapter implements GameCatalogProviderAdapter{
  constructor(public key:string,public name:string,private endpoint:string,private headers:Record<string,string>={}){}
  async fetchCatalog():Promise<GameCatalogEnvelope>{
    const response=await fetch(this.endpoint,{headers:{accept:'application/json',...this.headers}})
    if(!response.ok)throw new Error('Game provider HTTP '+response.status)
    const payload=await response.json() as GameCatalogEnvelope
    return normalizeGameCatalog({...payload,provider:{...(payload.provider||{}),key:this.key,name:this.name,type:'api',catalogUrl:this.endpoint}})
  }
}
