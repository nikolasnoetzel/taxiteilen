# TaxiTeilen

**Ein Taxi. Geteilt ist es fair.** — Plattform zum Teilen von Flughafen-Taxis
auf festen Strecken (v1-Korridore: Kiel↔HAM, München↔MUC, Frankfurt↔FRA,
Düsseldorf↔DUS).

Ein **Initiator** legt eine Fahrt an, bestellt das Taxi telefonisch und zahlt
den Fahrer. **Mitfahrer** zahlen ihren festen Anteil + 15 % Servicegebühr
sofort per Stripe Checkout; das Geld liegt treuhänderisch auf dem
Plattform-Konto und wird 48 h nach der Fahrt automatisch an den Initiator
ausgezahlt (Stripe Connect Express, Separate Charges & Transfers).

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [`docs/policies.md`](docs/policies.md) | Verbindliches Storno-/Auszahlungs-Regelwerk P1–P8, Gebühren-Semantik |
| [`docs/routes.md`](docs/routes.md) | Strecken, Festpreise (mit Quellen), Taxizentralen, Ausbauplan |
| [`docs/stripe-setup.md`](docs/stripe-setup.md) | Stripe-Setup, Remix-Checkliste, E2E-Testprotokoll, Live-Switch |

## Stack

- **Frontend:** React 18 + Vite + TypeScript, Tailwind + shadcn/ui,
  TanStack Query, framer-motion. Design-Tokens in `src/index.css`.
- **Backend:** Supabase (Postgres + Auth + Realtime + Edge Functions),
  Schema in `supabase/migrations/20260707100000_v2_rebuild.sql`.
- **Payments:** Stripe — Edge Functions unter `supabase/functions/`
  (`join-ride`, `cancel-*`, `cron-payout`, `stripe-webhook`, …).
  Geld-Mathematik einmalig in `supabase/functions/_shared/pricing.ts`,
  Fristen in `_shared/policy.ts` — beide von Frontend und Backend genutzt
  und per Vitest getestet.
- **E-Mails:** pgmq-Queue + Lovable Email (`_shared/emails.ts`).

## Entwicklung

```sh
npm install
npm run dev       # http://localhost:8080
npm test          # Vitest (Pricing- & Policy-Regeln)
npm run build
```

Secrets (Supabase/Lovable Cloud, niemals ins Repo): `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SIGNING_SECRET`. Webhook-Anlage: `node scripts/stripe-bootstrap.mjs`.

## Deployment

Lovable-Projekt mit GitHub-Sync. Nach einem Remix: Checkliste in
[`docs/stripe-setup.md`](docs/stripe-setup.md#nach-einem-lovable-remix-neues-supabase-projekt)
(Secrets setzen, `app_settings.edge_base_url` updaten, Webhook neu anlegen).
