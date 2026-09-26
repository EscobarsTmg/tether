# Sports Data Clone Module

This module ingests normalized sports data into Supabase and exposes it through the existing admin console.

## Scope

- Providers
- Leagues and teams
- Fixtures and live score state
- Fixture events
- Provider-to-internal ID mappings
- Sync run monitoring
- Admin fixture overrides with audit logging

No payment, wagering, odds, or real-money functionality is part of this module.

## Provider connection

Configure these values outside Git:

- SPORTS_PROVIDER_URL
- SPORTS_PROVIDER_KEY
- SPORTS_PROVIDER_NAME
- SPORTS_PROVIDER_TOKEN

The generic adapter expects JSON that matches `automation/sports/types.ts`. Provider-specific transformations should be added before `normalizeSportsEnvelope()`.

## Admin sync

The browser and automation runner call the JWT-protected Supabase Edge Function:

`sports-clone-sync`

Supported actions:

- `ingest`: upserts normalized sports data idempotently.
- `override_fixture`: applies an admin correction and creates an audit record.

## Local verification

```bash
npm ci
npm run typecheck
npm run build
```

To run a configured provider sync:

```bash
npm run sports:sync
```


## Automatic full catalog discovery

The provider adapter is not limited to a hard-coded sport list. It discovers sports from the provider payload and creates the internal catalog automatically.

Large feeds can be paginated with:

- `SPORTS_PROVIDER_PAGE_SIZE`
- `SPORTS_PROVIDER_MAX_PAGES`
- `SPORTS_PROVIDER_CURSOR_PARAM`
- `SPORTS_PROVIDER_PAGE_PARAM`
- `SPORTS_PROVIDER_PAGE_SIZE_PARAM`
- `SPORTS_INGEST_BATCH_SIZE`

Sync order is dependency-safe:

1. sports catalog
2. leagues and teams
3. fixtures
4. fixture events
5. final full-sync checkpoint

Provider references that cannot be mapped are stored in `sports_unmapped_entities` and shown in Sports Admin instead of being silently discarded.

The normalized provider response may include:

```json
{
  "sports": [{"key":"football","name":"Football"}],
  "leagues": [],
  "teams": [],
  "fixtures": [],
  "events": [],
  "pagination": {
    "page": 1,
    "nextCursor": "next-token",
    "hasMore": true
  }
}
```

The provider-specific connector only needs to transform its response into this normalized structure.
