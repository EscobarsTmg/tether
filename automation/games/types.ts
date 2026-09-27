export type GameType='slot'|'live_casino'|'table'|'instant'|'virtual'|'other'
export type GameCatalogEnvelope={
  provider:{key:string;name:string;type?:'api'|'json'|'manual';catalogUrl?:string;metadata?:Record<string,unknown>}
  games:Array<{
    externalId:string;name:string;type?:GameType;category?:string|null;thumbnailUrl?:string|null;demoLaunchUrl?:string|null;
    certifiedRtp?:number|null;volatility?:'low'|'medium'|'high'|'unknown';maxMultiplier?:number|null;
    providerUpdatedAt?:string|null;metadata?:Record<string,unknown>
  }>
  triggerType?:'manual'|'api'|'scheduled'
}
export interface GameCatalogProviderAdapter{
  key:string
  name:string
  fetchCatalog():Promise<GameCatalogEnvelope>
}
