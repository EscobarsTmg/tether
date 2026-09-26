import type { ProviderEnvelope, ProviderSport } from './types'

const text = (value: unknown) => value == null ? '' : String(value).trim()
const iso = (value: unknown) => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) throw new Error('Invalid fixture date: ' + String(value))
  return date.toISOString()
}
const slug = (value: unknown) => text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')

export function normalizeSportsEnvelope(input: ProviderEnvelope): ProviderEnvelope {
  if (!input.provider?.key || !input.provider?.name) throw new Error('Provider key/name required')

  const derivedSports = new Map<string, ProviderSport>()
  const pushSport = (value: unknown) => {
    const raw = text(value)
    if (!raw) return
    const key = slug(raw)
    if (!key) return
    if (!derivedSports.has(key)) derivedSports.set(key, { key, name: raw })
  }

  for (const sport of input.sports || []) {
    const name = text(sport.name || sport.key)
    const key = slug(sport.key || name)
    if (!key || !name) continue
    derivedSports.set(key, { ...sport, key, name })
  }
  for (const row of input.leagues || []) pushSport(row.sport)
  for (const row of input.teams || []) pushSport(row.sport)
  for (const row of input.fixtures || []) pushSport(row.sport)

  return {
    ...input,
    provider: { ...input.provider, key: text(input.provider.key), name: text(input.provider.name) },
    sports: [...derivedSports.values()],
    leagues: (input.leagues || []).filter(x=>x.externalId && x.name).map(x=>({
      ...x,
      externalId:text(x.externalId),
      name:text(x.name),
      sport:slug(x.sport || 'football') || 'football',
    })),
    teams: (input.teams || []).filter(x=>x.externalId && x.name).map(x=>({
      ...x,
      externalId:text(x.externalId),
      name:text(x.name),
      sport:slug(x.sport || 'football') || 'football',
    })),
    fixtures: (input.fixtures || []).filter(x=>x.externalId && x.startsAt).map(x=>({
      ...x,
      externalId:text(x.externalId),
      sport:slug(x.sport || 'football') || 'football',
      startsAt:iso(x.startsAt),
      homeScore:Math.max(0,Number(x.homeScore || 0)),
      awayScore:Math.max(0,Number(x.awayScore || 0)),
      minute:x.minute == null ? null : Math.max(0,Number(x.minute)),
    })),
    events: (input.events || []).filter(x=>x.externalId && x.fixtureExternalId && x.eventType).map(x=>({
      ...x,
      externalId:text(x.externalId),
      fixtureExternalId:text(x.fixtureExternalId),
      eventType:text(x.eventType),
      occurredAt:x.occurredAt ? iso(x.occurredAt) : null,
    })),
  }
}
