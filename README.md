# Fintech Bank Panel

[![Bank Automation Skeleton](https://github.com/EscobarsTmg/tether/actions/workflows/automation.yml/badge.svg?branch=main)](https://github.com/EscobarsTmg/tether/actions/workflows/automation.yml)

React + Vite + TypeScript administration dashboard scaffold for a sandbox/open-banking style fintech operations panel.

## Run locally

```bash
npm install
npm run dev
```

## Cloud Browser (Browserless.io)

1. browserless.io'dan hesap aç.
2. Dashboard'dan token al.
3. `.env` dosyasına aşağıdaki değeri ekle:

```text
BROWSERLESS_WS_ENDPOINT=wss://production-sfo.browserless.io?token=TOKEN
```

4. Cloud browser otomasyon sunucusunu çalıştır:

```bash
npm install puppeteer-core && npm run automation:server
```

Puppeteer kurulumu için: `npm uninstall puppeteer && npm install puppeteer-core`

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

## Security model

This repository intentionally does not contain bank login credentials, PIN/OTP automation, credential scraping, or direct bank-transfer execution logic. Production integrations should use authorized bank/open-banking APIs and server-side approval controls.
