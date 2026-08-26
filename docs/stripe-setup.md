# Stripe-Setup & Testprotokoll

## Architektur in einem Satz

Mitfahrer zahlen sofort per Checkout auf das **Plattform-Konto**
(`transfer_group` = Fahrt-ID, kein `transfer_data`); 48 h nach Abfahrt
transferiert `cron-payout` jeden Anteil per `stripe.transfers.create`
(`source_transaction` = Charge) an den Express-Account des Initiators —
Stornos sind einfache Refunds, solange nicht ausgezahlt wurde.

## Einmaliges Setup (Sandbox/Test-Mode zuerst!)

1. **Secrets in Supabase/Lovable Cloud setzen** (nie in Chat/Git):
   - `STRIPE_SECRET_KEY` = `sk_test_…` (Sandbox „Taxi Teilen sandbox").
     Hinweis: Lovables eigene Stripe-Integration legt den Key ggf. unter dem
     Namen `STRIPE_TEST_API_KEY` ab — Functions und Bootstrap-Script
     akzeptieren beide Namen.
   - `STRIPE_WEBHOOK_SIGNING_SECRET` = kommt aus Schritt 3
2. **Connect aktivieren** (Dashboard → Connect → Get started):
   Plattform-Typ **Marketplace**, Accounts **Express**, Land **DE**.
   Platform-Profil ausfüllen und **Haftung für Verluste akzeptieren**
   (Voraussetzung für Separate Charges & Transfers).
   Connect → Branding: Name „TaxiTeilen", Icon, Markenfarbe `#F5C518`.
3. **Webhook anlegen** — am einfachsten per Script:
   ```bash
   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-bootstrap.mjs
   ```
   Das Script legt idempotent den Endpoint
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   mit den Events `checkout.session.completed`, `checkout.session.expired`,
   `charge.refunded`, `charge.dispute.created`, `account.updated` an und
   druckt das Signing Secret (→ Secret aus Schritt 1).
   *Manuell im Dashboard geht auch: Developers → Webhooks → Add endpoint;
   dabei „Events on your account" UND „Events on connected accounts"
   aktivieren (für `account.updated`).*
4. **Auszahlungsplan** der Connected Accounts: Standard (täglich automatisch)
   belassen.
5. **Zahlungsmethoden prüfen** (Settings → Payment methods): Nur Karte /
   Apple Pay / Google Pay. **SEPA-Lastschrift muss deaktiviert bleiben**
   (8-Wochen-Rückbuchungsrecht kollidiert mit dem Einbehalt, siehe
   `docs/policies.md`). Der Checkout pinnt zwar `payment_method_types: card`,
   aber die Dashboard-Einstellung ist die zweite Verteidigungslinie —
   Stripe aktiviert neue Methoden sonst teils automatisch.

## Nach einem Lovable-Remix (neues Supabase-Projekt)

1. Secrets im neuen Projekt setzen (Schritt 1).
2. `scripts/stripe-bootstrap.mjs` mit `SUPABASE_PROJECT_REF=<neue-ref>` laufen lassen.
3. Eine Zeile in der DB updaten (SQL-Editor):
   ```sql
   UPDATE app_settings SET value = to_jsonb('https://<neue-ref>.supabase.co/functions/v1'::text)
   WHERE key = 'edge_base_url';
   ```
4. Prüfen, dass die pg_cron-Jobs existieren: `SELECT jobname, schedule FROM cron.job;`
   (sonst Abschnitt 12 der Migration `20260707100000_v2_rebuild.sql` erneut ausführen).

## End-to-End-Testprotokoll (Test-Mode)

Testkarte: `4242 4242 4242 4242`, beliebiges Zukunftsdatum, beliebiger CVC.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | User A: registrieren, Dashboard → „Zahlungsempfang einrichten" (Express-Testonboarding durchklicken) | `profiles.stripe_connect_onboarding_complete = true` (via `account.updated`-Webhook) |
| 2 | User A: Fahrt erstellen (z. B. Kiel → HAM, übermorgen 06:30, 4 Plätze) | Fahrt erscheint in Suche; Sitzpreis €37,50 bei €150-Route |
| 3 | User B: beitreten, mit Testkarte zahlen | Redirect zurück, Status „bezahlt"; `payments.status='paid'`; B + A bekommen E-Mails |
| 4 | User B: sofort stornieren (≥24 h vorher) | `payments.status='refunded'`, Refund im Stripe-Dashboard sichtbar, Platz wieder frei (P1) |
| 5 | User B: erneut beitreten und zahlen; dann Fahrt-Zeit in DB auf +20 h setzen und B storniert | `cancelled_late`, `payments.status='retained'` (P2) |
| 6 | Zeit weiterstellen: `departure_at` in Vergangenheit, `payout_due_at < now()`, Gruppe `locked` | Nächster `cron-payout`-Lauf: Transfer über B's Anteil an A's Express-Account (Stripe → Connect → Transfers), Gruppe `completed`, Payout-E-Mail an A |
| 7 | Dispute-Pfad: vor Payout `open-dispute` als B | Payout pausiert; nach `resolve-dispute` (`resolved_refund`) bekommt B Geld zurück |
| 8 | Initiator-Storno ≥24 h (P4) | Gruppe `initiator_needed`, Takeover-Mail an B; B übernimmt → B's Payment refunded, B ist Initiator |
| 9 | Checkout abbrechen / 35 min warten (Session-Lifetime, siehe `policy.ts`) | Membership `expired`, Platz frei (`checkout.session.expired`) |

Zeitreisen für Tests (SQL-Editor):
```sql
UPDATE ride_groups SET departure_at = now() - interval '1 hour',
  payout_due_at = now() - interval '1 minute', status = 'locked' WHERE id = '<id>';
SELECT public.invoke_edge_function('cron-payout');
```

## Live-Switch (wenn alles grün ist)

1. Connect im **Live-Mode** aktivieren (Platform-Profil erneut bestätigen).
2. Live-Keys: `STRIPE_SECRET_KEY=sk_live_…` als Secret setzen.
3. `STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-bootstrap.mjs`
   → neues Live-Signing-Secret setzen.
4. Test-Fahrt mit echter Karte und kleinem Betrag durchspielen, Refund prüfen.

## Offene Risiken / später

- **Chargeback nach Auszahlung:** Webhook loggt „manual transfer reversal
  needed" — im Dashboard `Transfers → Reverse` ausführen. Automatisierung später.
- **Initiator-Pfand:** P5 bestraft aktuell nur mit Strikes. Option später:
  SetupIntent beim Erstellen, Strafgebühr bei Late-Cancel.
- **Extended Authorization** (Holds >7 Tage) wäre eine Alternative zur
  Sofort-Abbuchung, ist aber kartenabhängig und komplexer — bewusst verworfen.
