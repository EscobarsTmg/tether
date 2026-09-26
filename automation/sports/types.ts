export type SportName = 'football' | 'basketball' | 'tennis' | string

export type ProviderEnvelope = {
  provider: { key: string; name: string; mode?: 'api'|'json'|'manual'; baseUrl?: string; metadata?: Record<string, unknown> }
  leagues?: Array<{ externalId: string; name: string; sport?: SportName; country?: string; logoUrl?: string; metadata?: Record<string, unknown> }>
  teams?: Array<{ externalId: string; name: string; sport?: SportName; country?: string; logoUrl?: string; metadata?: Record<string, unknown> }>
  fixtures?: Array<{
    externalId: string; sport?: SportName; leagueExternalId?: string; homeTeamExternalId?: string; awayTeamExternalId?: string
    startsAt: string; status?: 'scheduled'|'live'|'paused'|'finished'|'postponed'|'cancelled'; minute?: number|null
    homeScore?: number; awayScore?: number; venue?: string|null; providerUpdatedAt?: string|null; metadata?: Record<string, unknown>
  }>
  events?: Array<{
    externalId: string; fixtureExternalId: string; eventType: string; minute?: number|null; teamExternalId?: string|null
    participantName?: string|null; detail?: string|null; occurredAt?: string|null; metadata?: Record<string, unknown>
  }>
  triggerType?: 'manual'|'api'|'scheduled'
}

export interface SportsProviderAdapter {
  key: string
  name: string
  fetchSnapshot(): Promise<ProviderEnvelope>
}
