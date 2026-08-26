# VERALTET — nicht verwenden

Dieser Audit-Plan beschrieb die **v1** (Pre-Auth + Capture, Flugauswahl,
`ride_requests`). Die v1 wurde im Juli 2026 vollständig durch den v2-Rebuild
ersetzt (Sofort-Charge + Separate Charges & Transfers, Festpreis-Routen).

Aktuelle Quellen:

- `README.md` — Einstieg und Doku-Index
- `docs/policies.md` — verbindliche Geld-Regeln (P1–P8)
- `docs/ROADMAP.md` — Stand, offene Punkte, Tech-Debt
- `docs/stripe-setup.md` — Zahlungsarchitektur, Setup, Testprotokoll

Wichtig für Lovable: Die Migration `supabase/migrations/20260707100000_v2_rebuild.sql`
muss auf dem Supabase-Projekt angewendet werden, **bevor** die Datenbanktypen
(`src/integrations/supabase/types.ts`) aus der DB regeneriert werden — sonst
verschwinden die v2-Tabellen aus den Typen und das Frontend baut nicht mehr.
