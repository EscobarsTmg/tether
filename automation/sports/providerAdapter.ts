import type { ProviderEnvelope, SportsProviderAdapter } from './types'
import { normalizeSportsEnvelope } from './normalizer'

export class HttpJsonSportsAdapter implements SportsProviderAdapter {
  constructor(
    public key: string,
    public name: string,
    private endpoint: string,
    private headers: Record<string,string> = {},
  ) {}

  async fetchSnapshot(): Promise<ProviderEnvelope> {
    const response = await fetch(this.endpoint, { headers: { accept: 'application/json', ...this.headers } })
    if (!response.ok) throw new Error('Sports provider HTTP ' + response.status)
    const payload = await response.json() as ProviderEnvelope
    return normalizeSportsEnvelope({
      ...payload,
      provider: { ...(payload.provider || {}), key:this.key, name:this.name, mode:'api', baseUrl:this.endpoint },
    })
  }
}
