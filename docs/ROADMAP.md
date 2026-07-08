# Roadmap & Handoff

Stand: 07.07.2026, Branch `claude/taxi-talen-rebuild-rfp67x`. Dieses Dokument ist
der Einstiegspunkt für die nächste Arbeits-Session (neuer Chat): erst
`README.md`, dann `docs/policies.md`, dann dieses Dokument lesen.

## Was fertig ist

- **Backend v2 komplett:** Schema (`supabase/migrations/20260707100000_v2_rebuild.sql`),
  12 Edge Functions (Erstellen/Beitreten/Storno/Takeover/No-Show/Disputes/Crons/Webhook),
  Transaktions-E-Mails, Seeds für 4 Strecken + 10 Taxizentralen.
- **Frontend v2 komplett:** neues Design-System („Premium Mobility"), Landing,
  Erstellen-Wizard, Suche, Trip-Seite, Dashboard. Playwright-verifiziert (Screenshots).
- **Code-Review Runde 1:** 3 von 5 Finder-Agents liefen (Zeile-für-Zeile, Geld-Pfad,
  Cleanup); 12 bestätigte Findings wurden gefixt (u. a. verwaiste retained-Zahlungen
  beim Initiator-Storno, „bezahlt-nach-Storno"-Races via Webhook-Backstop, kaputter
  Bezahlen-Retry, Idempotency-Key-Replay, Timezone-Bug, `resolved_dissolve` für P7).
- Tests: 20 Vitest-Tests (Pricing + Policy) grün; `tsc` clean; Build grün.

## Offene Punkte (nächste Session)

1. **Deploy & Test-Mode-E2E** (wichtigster nächster Schritt): Lovable-Remix,
   Secrets setzen, Migration anwenden, Testprotokoll aus `docs/stripe-setup.md`
   Punkt für Punkt durchspielen (Testkarte 4242…, Refund, Transfer, Takeover).
2. **Review Runde 2:** Zwei Finder-Winkel starben am Session-Limit und sollten
   nachgeholt werden: (a) „removed behavior" (v1→v2-Diff auf verlorene Invarianten),
   (b) „cross-file contracts" (api.ts ↔ Edge Functions ↔ Migration ↔ RLS,
   insbesondere: können anonyme Nutzer die Suche wirklich lesen; funktioniert
   `stripe-connect-status/-onboarding` [v1-Code, unverändert] mit dem neuen Frontend).
3. **Bekannte Tech-Debt (bewusst vertagt):**
   - N+1-Queries in `cron-lock-rides`/`cron-payout`/`cron-reminders` batchen
   - Stepper-Komponente deduplizieren (`CreateRide.tsx` ↔ `RideDetail.tsx`),
     `routeLabel()` in `use-routes.ts` überall verwenden statt Inline-Ternaries
   - Payout-TOCTOU: Dispute, der exakt zwischen Dispute-Check und Transfer
     eintrifft, pausiert nicht mehr (Restrisiko klein; Fix: Re-Check vor Transfer)
   - Chargeback nach bereits erfolgtem Transfer: heute nur Log → manueller
     `transfers.createReversal` (siehe `docs/stripe-setup.md`)
   - Lint-Altlasten in v1-Dateien (`use-chat.ts`, `Auth.tsx`, `ResetPassword.tsx`)
4. **Produkt-Backlog:** weitere Strecken/Zubringerstädte (`docs/routes.md`,
   Ausbau-Reihenfolge), Initiator-Pfand via SetupIntent (P5-Verschärfung),
   Admin-Mini-UI für Disputes, Profilbilder/Bewertungen, get-flights wieder
   anbinden (Verspätungs-Alerts) — bewusst v2-Scope raus.

## Betriebs-Wissen in Kürze

- Geld-Regeln: `docs/policies.md` (P1–P8 + Auflösungs-Regel). Code-Quellen:
  `_shared/pricing.ts` (20 %), `_shared/policy.ts` (Fristen), `_shared/money.ts`
  (refund/transfer/dissolve — NUR hierüber Geld bewegen).
- Nach Lovable-Remix: `docs/stripe-setup.md` Abschnitt „Nach einem Lovable-Remix"
  (Secrets, `app_settings.edge_base_url`, Webhook, cron.job prüfen).
- Admin-Aktionen (Disputes) laufen über `resolve-dispute` mit
  `resolution: resolved_refund | resolved_payout | resolved_dissolve`
  (+ `strike_initiator: true` bei Initiator-No-Show); Admin = `profiles.is_admin`.
