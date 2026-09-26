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
