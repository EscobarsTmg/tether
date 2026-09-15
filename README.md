# Fintech Bank Panel

React + Vite + TypeScript administration dashboard scaffold for a sandbox/open-banking style fintech operations panel.

## Run locally

```bash
npm install
npm run dev
```

## Bolt.new

Import this GitHub repository into Bolt.new. The project works immediately with sandbox data.

To connect Supabase, add these project environment variables in Bolt:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Current modules

- Dashboard
- Bank Accounts
- Transactions
- Account Movements scaffold
- Account History
- Reports scaffold
- Reconciliation scaffold
- Users scaffold
- Audit Log scaffold
- Settings scaffold
- Responsive sidebar layout
- Sandbox financial data
- Supabase client scaffold

## Open Banking adapter

The existing `bank-sync` and `payment-orchestrator` Edge Functions use the server-side adapter in:

```text
supabase/functions/_shared/open-banking-adapter.ts
```

Required Supabase Edge Function secrets:

```bash
supabase secrets set \
  ADAPTER_URL="https://adapter.example.com" \
  ADAPTER_SECRET="replace-me" \
  SUPABASE_SERVICE_ROLE_KEY="replace-me" \
  FRONTEND_URL="https://app.example.com" \
  OPEN_BANKING_CALLBACK_URL="https://PROJECT_REF.supabase.co/functions/v1/consent-callback" \
  PAYMENT_RETURN_URL="https://app.example.com/payments/callback"
```

Deploy the Open Banking functions:

```bash
supabase functions deploy start-consent
supabase functions deploy consent-callback
supabase functions deploy bank-sync
supabase functions deploy payment-orchestrator
```

Apply migrations:

```bash
supabase db push
```

Provider adapter contract:

```text
POST /consents
POST /authorizations/exchange
GET  /accounts
GET  /transactions
POST /payments
GET  /payments/:providerPaymentId
```

All adapter calls happen server-side. The browser only receives provider-hosted authorization URLs and application data intended for the authenticated operator.

## Security model

This repository intentionally does not contain bank login credentials, PIN/OTP automation, credential scraping, or direct bank-site scraping. Production integrations use authorized bank/open-banking APIs and provider-hosted OAuth/SCA authorization flows. Secrets, provider tokens and signing material remain server-side.
