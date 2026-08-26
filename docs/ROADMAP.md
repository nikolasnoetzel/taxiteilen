# Roadmap & Handoff

Stand: 26.08.2026 (Session 3, autonome Bau-/Test-Runde). Dieses Dokument ist
der Einstiegspunkt für die nächste Arbeits-Session (neuer Chat): erst
`README.md`, dann `docs/policies.md`, dann dieses Dokument lesen.
`main` und `claude/taxi-talen-rebuild-rfp67x` sind identisch zu halten
(Lovable synct `main`).

## Was fertig ist

- **Backend v2 komplett:** Schema (`supabase/migrations/20260707100000_v2_rebuild.sql`),
  13 Edge Functions (Erstellen/Beitreten/Storno/Takeover/No-Show/Disputes/
  Admin-Liste/Crons/Webhook), Transaktions-E-Mails, Seeds für 4 Strecken +
  10 Taxizentralen.
- **Frontend v2 komplett:** Design-System („Premium Mobility"), Landing,
  Erstellen-Wizard, Suche, Trip-Seite mit Gruppenchat, Dashboard,
  **Admin-Arbeitsplatz `/admin`** (offene Disputes entscheiden).
- **Servicegebühr: 15 %** (26.08. von 20 % gesenkt — Policy, Code, Tests,
  UI-Texte und AGB in einem Zug).
- **Code-Review Runde 1 (07.07.):** 12 bestätigte Findings gefixt.
- **Code-Review Runde 2 (26.08., Multi-Agent + adversariale Verifikation):**
  die zwei offenen Winkel (removed-behavior, cross-file contracts) plus
  Review der frischen Änderungen. Wichtigste Fixes:
  - **KRITISCH: Selbst-Eskalation zu `is_admin`** über spaltenoffenes
    profiles-UPDATE → Column-Grants (`20260826181000_profiles_column_grants.sql`)
  - Doppelbelastungs-Fenster im join-ride-Retry (alte Session blieb zahlbar)
    + Webhook-Backstop, der doppelte Completions refundet
  - Onboarding-Prädikat vereinheitlicht (`payouts_enabled` überall)
  - Abfahrts-Guard in cancel-ride (kein „Storno" nach gefahrener Fahrt)
  - Takeover atomar (Claim vor Refund — kein Doppel-Übernahme-Race)
  - process-email-queue war öffentlich → Cron-Secret/Service-Role-Gate;
    requireCronSecret fail-closed
  - AGB-Zustimmung ging bei E-Mail-Bestätigung verloren → Signup-Metadaten
    + Trigger (`20260826174500_signup_metadata_in_trigger.sql`)
- **Tests: 29 Vitest-Tests grün** — Pricing, Policy und die neue
  **Lebenszyklus-Simulation** (`src/test/lifecycle.sim.test.ts`): P1–P7-Geldflüsse
  gegen den echten `_shared/money.ts`-Code mit Stripe-/DB-Fakes inkl.
  Geld-Erhaltungssatz. `tsc` clean, Build grün.
- **UI-Smoke ohne Backend:** `node scripts/ui-smoke.mjs` fährt Landing, Suche,
  Fahrt-Detail und AGB mit gemockten Supabase-Antworten in Playwright durch
  (10 Checks, prüft u. a. die 15%-Preise im gerenderten UI).

## Offene Punkte (nächste Session)

1. **Migration anwenden + Deploy-E2E** (wichtigster nächster Schritt).
   **Achtung:** Die Live-DB läuft noch v1! Lovable hat am 12.07. die Typen aus
   der Live-DB regeneriert und damit die v2-Typen zerstört (wurde revertiert).
   Reihenfolge zwingend:
   1. Migrationen auf dem Supabase-Projekt anwenden (`20260707100000_v2_rebuild.sql`
      + die beiden 20260826er) — via Lovable oder SQL-Editor.
   2. Erst DANACH Typen regenerieren (sonst verschwinden die v2-Tabellen wieder
      aus `src/integrations/supabase/types.ts` und das Frontend baut nicht).
   3. Stripe-Sandbox ist vorbereitet: Webhook-Endpoint aktiv (5 Events),
      `STRIPE_WEBHOOK_SIGNING_SECRET` + Key (als `STRIPE_TEST_API_KEY`) in
      Lovable Cloud gesetzt. Offen: Connect aktivieren (Marketplace/Express/DE,
      Haftung akzeptieren) + Branding — macht Nikolas im Dashboard.
   4. Dann Testprotokoll aus `docs/stripe-setup.md` Punkt für Punkt
      (Testkarte 4242…, Refund, Retained, Transfer, Takeover, Dispute) —
      bei offener Netzwerk-Freigabe kann Claude das selbst fahren.
2. **Bekannte Tech-Debt (bewusst vertagt):**
   - N+1-Queries in `cron-lock-rides`/`cron-payout`/`cron-reminders` batchen
   - Stepper-Komponente deduplizieren (`CreateRide.tsx` ↔ `RideDetail.tsx`),
     `routeLabel()` überall verwenden statt Inline-Ternaries
   - Payout-TOCTOU: Dispute exakt zwischen Dispute-Check und Transfer
     pausiert nicht mehr (Restrisiko klein; Fix: Re-Check vor Transfer)
   - Chargeback nach bereits erfolgtem Transfer: heute nur Log → manueller
     `transfers.createReversal` (siehe `docs/stripe-setup.md`)
   - Lint-Altlasten nur noch in `get-flights` (verwaist) und `auth-email-hook`
     (14 `no-explicit-any`)
3. **Produkt-Backlog:** weitere Strecken/Zubringerstädte (`docs/routes.md`,
   Ausbau-Reihenfolge), Initiator-Pfand via SetupIntent (P5-Verschärfung),
   Profilseite (Name/Telefon ändern, DSGVO-Löschung), Profilbilder/Bewertungen,
   Ungelesen-Zähler + Mail-Benachrichtigung für den Gruppenchat, get-flights
   wieder anbinden (Verspätungs-Alerts), Admin-Link im Dashboard für
   `is_admin`-Nutzer (Seite existiert, ist nur per URL erreichbar).

## Betriebs-Wissen in Kürze

- Geld-Regeln: `docs/policies.md` (P1–P8 + Auflösungs-Regel). Code-Quellen:
  `_shared/pricing.ts` (15 %), `_shared/policy.ts` (Fristen), `_shared/money.ts`
  (refund/transfer/dissolve — NUR hierüber Geld bewegen).
- Nach Lovable-Remix: `docs/stripe-setup.md` Abschnitt „Nach einem Lovable-Remix"
  (Secrets, `app_settings.edge_base_url`, Webhook, cron.job prüfen).
- Admin: `/admin` (UI) bzw. `resolve-dispute` mit
  `resolution: resolved_refund | resolved_payout | resolved_dissolve`
  (+ `strike_initiator: true` bei Initiator-No-Show); Admin = `profiles.is_admin`
  (nur per SQL setzbar — Column-Grants verhindern Selbst-Setzen, das ist Absicht).
- Test-Suiten lokal: `npx vitest run` (29 Tests) · `node scripts/ui-smoke.mjs`
  (Playwright-Smoke) · `npx tsc --noEmit` · `npm run build`.
