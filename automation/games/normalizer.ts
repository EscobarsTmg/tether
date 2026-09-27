import type { GameCatalogEnvelope,GameType } from './types'
const text=(v:unknown)=>v==null?'':String(v).trim()
const allowed=new Set<GameType>(['slot','live_casino','table','instant','virtual','other'])
export function normalizeGameCatalog(input:GameCatalogEnvelope):GameCatalogEnvelope{
  if(!input.provider?.key||!input.provider?.name)throw new Error('Provider key/name required')
  return{
    ...input,
    provider:{...input.provider,key:text(input.provider.key),name:text(input.provider.name)},
    games:(input.games||[]).filter(x=>x.externalId&&x.name).map(x=>{
      const type=allowed.has((x.type||'other') as GameType)?(x.type||'other') as GameType:'other'
      const rtp=x.certifiedRtp==null?null:Number(x.certifiedRtp)
      const max=x.maxMultiplier==null?null:Number(x.maxMultiplier)
      return{
        ...x,externalId:text(x.externalId),name:text(x.name),type,
        certifiedRtp:Number.isFinite(rtp as number)?Math.max(0,Math.min(100,rtp as number)):null,
        maxMultiplier:Number.isFinite(max as number)?Math.max(0,max as number):null,
      }
    }),
  }
}
