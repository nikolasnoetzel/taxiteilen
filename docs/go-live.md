# Go-Live-Checkliste: taxiteilen.de mit Stripe Connect

Stand: 06.10.2026. Reihenfolge ist wichtig — jeder Block baut auf dem vorigen auf.
Legende: **[N]** macht Nikolas (Dashboards, zu denen nur er Zugang hat),
**[C]** macht Claude (Code, Scripts, Tests), **[N+C]** gemeinsam im Browser.

## Phase 1 — Datenbank auf v2 bringen (Voraussetzung für alles) [N]

Die Live-DB (`gabdgtrutcbozhpltxxn`) läuft noch v1. Ohne diesen Schritt
arbeitet das neue Frontend gegen ein Schema, das es nicht gibt.

1. Supabase Dashboard → SQL Editor. Nacheinander ausführen (Inhalt der Dateien
   komplett einfügen): `supabase/migrations/20260707100000_v2_rebuild.sql`,
   dann `20260826174500_signup_metadata_in_trigger.sql`,
   `20260826181000_profiles_column_grants.sql`,
   `20260826182000_ride_history_visibility.sql`.
   (Alternative: Lovable anweisen „wende alle ausstehenden Migrationen an".)
2. Prüfen: `SELECT jobname, schedule FROM cron.job;` → vier `taxiteilen-*`-Jobs.
   `SELECT * FROM app_settings;` → `edge_base_url` zeigt auf
   `https://gabdgtrutcbozhpltxxn.supabase.co/functions/v1`, `cron_secret` gesetzt.
3. **Erst jetzt** darf Lovable die Typen regenerieren
   (`src/integrations/supabase/types.ts`) — vorher zerstört das den Build.
4. Dich selbst zum Admin machen (geht nur per SQL, Absicht):
   `UPDATE profiles SET is_admin = true WHERE email = 'DEINE@MAIL';`

## Phase 2 — Secrets & E-Mail in Lovable Cloud [N]

- `STRIPE_TEST_API_KEY` (oder `STRIPE_SECRET_KEY`) = `sk_test_…` ✅ gesetzt
- `STRIPE_WEBHOOK_SIGNING_SECRET` = `whsec_…` ✅ gesetzt
- `LOVABLE_API_KEY` für den E-Mail-Versand: prüfen, dass er existiert und die
  Absender-Domain verifiziert ist (siehe Phase 5, Domain).

## Phase 3 — Stripe-Sandbox fertig konfigurieren [N+C im Browser]

Im Dashboard „Taxi Teilen sandbox" (Sandbox-Schalter oben links aktiv):

1. **Connect aktivieren:** Connect → „Get started" → Plattform-Profil:
   Geschäftsmodell *Marketplace* („Plattform, die Käufer und Verkäufer
   verbindet"), Konten *Express*, Land der Nutzer *Deutschland*, Branche
   Transport/Mobilität. Beim Thema Haftung: **„Plattform übernimmt Verluste"
   (Loss liability) akzeptieren** — Pflicht für unser Modell (Separate Charges &
   Transfers). Alle Fragen, die nach „Stripe-hosted onboarding" fragen: ja.
2. **Branding** (Settings → Connect → Branding): Name „TaxiTeilen", Logo,
   Markenfarbe `#F5C518`, Akzent `#141414` — erscheint im Express-Onboarding.
3. **Zahlungsmethoden** (Settings → Payment methods): Karte, Apple Pay,
   Google Pay an; **SEPA-Lastschrift aus** (8-Wochen-Rückbuchung kollidiert mit
   dem Einbehalt). Der Code pinnt zwar `card`, das Dashboard ist die zweite Linie.
4. **Webhook** ✅ existiert (Workbench → Webhooks, 5 Events). Einmal „Send test
   event" → 200 erwartet.
5. Kein manuelles „Create test account" nötig — unsere Onboarding-Function legt
   Express-Konten programmatisch an.

## Phase 4 — Test-Mode End-to-End [C, bei offener Netzwerk-Freigabe]

Testprotokoll in `docs/stripe-setup.md` (9 Schritte): Registrieren, Zahlungs-
empfang einrichten (Express-Testonboarding mit Fake-Daten), Fahrt erstellen,
beitreten mit Testkarte `4242 4242 4242 4242`, Storno ≥24 h (Refund),
Storno <24 h (Einbehalt), Zeitreise → Auszahlung (Transfer), Dispute,
Takeover, abgelaufener Checkout. Claude kann das selbst fahren, sobald die
Claude-Umgebung `api.stripe.com` und `*.supabase.co` erreichen darf
(Environments → Network access) — Nikolas liefert dazu die Sandbox-Keys erneut.

## Phase 5 — Domain taxiteilen.de [N, Code-Anpassung C]

1. Lovable → Project → Settings → Domains → `taxiteilen.de` hinzufügen; die
   angezeigten DNS-Einträge beim Registrar setzen (A/CNAME + Verifizierungs-TXT).
   `www.taxiteilen.de` als Redirect dazu.
2. Code auf die echte Domain umstellen [C] — aktuell steht dort teils
   **`taxi-teilen.de` mit Bindestrich** (falsch): `SITE_URL` und `FROM_DOMAIN`/
   `SENDER_DOMAIN` in `supabase/functions/_shared/emails.ts`, Fallback-Origin in
   `join-ride`, `app_settings` bleibt (Supabase-URL). Nikolas bestätigt die
   gewünschte Absender-Domain (Vorschlag: `notify.taxiteilen.de`).
3. E-Mail-Absender-Domain in Lovable Cloud (E-Mail-Integration) verifizieren
   (DKIM/SPF-DNS-Einträge), sonst landen Transaktionsmails nicht an.
4. Google-OAuth: In der Lovable-Auth-Konfiguration `https://taxiteilen.de` als
   Site-URL/Redirect ergänzen.

## Phase 6 — Rechtstexte [N, Einbau C]

- Impressum: Telefon/E-Mail-Platzhalter ersetzen (Firmendaten Snohomish Capital
  UG sind drin). Datenschutz: 6 Platzhalter `[BETREIBER]`, `[STRASSE]`, `[PLZ]`,
  `[STADT]`, `[EMAIL]`, `[DATUM]` füllen; Stripe + Lovable/Supabase als
  Auftragsverarbeiter nennen. AGB: Datum setzen; 15 %-Gebühr und P1–P8 sind
  bereits eingearbeitet.
- Empfehlung: Rechtstexte einmal von einem Anwalt gegenlesen lassen
  (Plattform-/Vermittlermodell, Verbraucher-Widerruf bei Vermittlungsleistung,
  Einbehalt bei Spätstorno).

## Phase 7 — Live-Schaltung Stripe [N+C]

1. **Stripe-Konto live aktivieren** (Dashboard → „Activate payments"):
   Unternehmensdaten der UG, HRB, wirtschaftlich Berechtigte, Bankkonto, Website
   `https://taxiteilen.de` — Stripe prüft (KYB), dauert Stunden bis Tage.
2. Connect im **Live-Modus** erneut aktivieren (Plattform-Profil + Haftung
   nochmal bestätigen — Sandbox-Einstellungen werden nicht übernommen).
3. Live-Keys: `sk_live_…` als Secret in Lovable Cloud setzen (Test-Key ersetzen).
4. Live-Webhook: `STRIPE_SECRET_KEY=sk_live_… node scripts/stripe-bootstrap.mjs`
   → neues `whsec_…` als Secret setzen [C].
5. Zahlungsmethoden + Branding im Live-Modus prüfen (getrennt von der Sandbox).
6. **Live-Testfahrt** mit echter Karte und kleinem Betrag (Route Düsseldorf
   €35 → Anteil €8,75 + 15 % = €10,06): Beitritt, Refund per Storno, dann
   Express-Onboarding eines echten Initiators mit echtem Bankkonto, Zeitreise
   per SQL → Transfer prüfen, Auszahlung auf dem Express-Konto sichtbar.
7. Monitoring: Stripe Workbench (Webhook-Fehlerrate 0 %), Supabase Edge-Logs,
   `/admin` für Disputes. Chargeback nach Auszahlung → manuell
   Transfers → Reverse (siehe `docs/stripe-setup.md`).

## Phase 8 — Launch

- Routen-Festpreise gegen aktuelle Marktpreise prüfen (`docs/routes.md`).
- Taxizentralen-Nummern einmal anrufen/verifizieren.
- Erste echte Fahrt mit Freunden als Initiator/Mitfahrer durchspielen.
