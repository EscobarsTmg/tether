import type { ProviderEnvelope } from './types'

const text = (value: unknown) => value == null ? '' : String(value).trim()
const iso = (value: unknown) => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) throw new Error('Invalid fixture date: ' + String(value))
  return date.toISOString()
}

export function normalizeSportsEnvelope(input: ProviderEnvelope): ProviderEnvelope {
  if (!input.provider?.key || !input.provider?.name) throw new Error('Provider key/name required')
  return {
    ...input,
    provider: { ...input.provider, key: text(input.provider.key), name: text(input.provider.name) },
    leagues: (input.leagues || []).filter(x=>x.externalId && x.name).map(x=>({ ...x, externalId:text(x.externalId), name:text(x.name) })),
    teams: (input.teams || []).filter(x=>x.externalId && x.name).map(x=>({ ...x, externalId:text(x.externalId), name:text(x.name) })),
    fixtures: (input.fixtures || []).filter(x=>x.externalId && x.startsAt).map(x=>({
      ...x, externalId:text(x.externalId), startsAt:iso(x.startsAt), homeScore:Math.max(0,Number(x.homeScore || 0)),
      awayScore:Math.max(0,Number(x.awayScore || 0)), minute:x.minute == null ? null : Math.max(0,Number(x.minute)),
    })),
    events: (input.events || []).filter(x=>x.externalId && x.fixtureExternalId && x.eventType).map(x=>({
      ...x, externalId:text(x.externalId), fixtureExternalId:text(x.fixtureExternalId), eventType:text(x.eventType),
      occurredAt:x.occurredAt ? iso(x.occurredAt) : null,
    })),
  }
}
