# TaxiTeilen — Storno- & Auszahlungsregeln (Policy v2)

**Dieses Dokument ist die verbindliche Quelle für alle Geld-Regeln.**
Es wird im Code erzwungen durch `supabase/functions/_shared/policy.ts`
(Fristen) und `supabase/functions/_shared/pricing.ts` (Gebühren) und durch
Unit-Tests abgesichert (`src/test/policy.test.ts`, `src/test/pricing.test.ts`).
Änderungen an Regeln: zuerst hier ändern, dann Code + Tests anpassen — im selben PR.

## Rollen & Geldfluss

- **Initiator:** legt die Fahrt an, bestellt das Taxi telefonisch, zahlt den
  Fahrer direkt im Taxi. Zahlt selbst nichts über die Plattform und erhält die
  Anteile der Mitfahrer **48 h nach Abfahrt** auf sein Stripe-Konto (Connect Express).
- **Mitfahrer:** zahlt beim Beitritt sofort per Karte/Apple Pay/Google Pay
  (Stripe Checkout). Das Geld liegt bis zur Auszahlung auf dem Plattform-Konto.
- **Plattform:** vermittelt, hält das Geld treuhänderisch und behält die Servicegebühr.

## Preis & Gebühren

- Jede Strecke hat einen **Festpreis** (Tabelle `routes`, siehe `docs/routes.md`).
- **Sitzpreis** = Festpreis ÷ Gesamtplätze, bei Fahrt-Erstellung eingefroren
  (Rundungsrest trägt der Initiator).
- Mitfahrer zahlt **Anteil + 20 % Servicegebühr**. Der Initiator erhält den
  vollen Anteil; die Gebühr behält die Plattform.
- Der Sitzpreis hängt an den **angebotenen** Plätzen, nicht an der Auslastung:
  Wer einem 4-Plätze-€120-Taxi beitritt, zahlt immer €36 — egal ob die Fahrt
  am Ende zu zweit oder zu viert stattfindet. Das Füllrisiko trägt der
  Initiator (jeder Mitfahrer reduziert seine Kosten strikt).

**Beispiel:** Strecke €120, 4 Plätze → Sitzpreis €30, Mitfahrer zahlt €36.
Bei 3 Mitfahrern: Plattform nimmt €108 ein, zahlt €90 an den Initiator aus,
behält €18 (abzüglich Stripe-Kosten). Der Initiator zahlt dem Fahrer €120 und
trägt netto €30 — seinen fairen Anteil.

## Regelwerk P1–P8

| # | Wer | Wann | Geld | Konsequenz |
|---|-----|------|------|-----------|
| **P1** | Mitfahrer storniert | **≥ 24 h** vor Abfahrt | Volle Rückerstattung (Anteil + Gebühr) | Platz wird wieder frei, Initiator wird informiert |
| **P2** | Mitfahrer storniert | **< 24 h** | Keine Rückerstattung. Anteil → Initiator (bei Auszahlung), Gebühr → Plattform | — |
| **P3** | Mitfahrer erscheint nicht | Abfahrt | wie P2 | Initiator markiert No-Show (bis 48 h nach Abfahrt); Mitfahrer kann per Dispute widersprechen |
| **P4** | Initiator storniert | **≥ 24 h** | **Takeover-Fenster** (12 h, endet spätestens am 24-h-Cutoff): Ein Mitfahrer mit eingerichtetem Zahlungsempfang kann übernehmen — sein eigener Beitrag wird erstattet, die übrigen Anteile gehen später an ihn. Übernimmt niemand: Auflösung + volle Rückerstattung an alle | Kein Strike |
| **P5** | Initiator storniert / No-Show | **< 24 h** | Volle Rückerstattung an alle Mitfahrer | **Strike** für den Initiator; 3 Strikes ⇒ Konto gesperrt (`profiles.blocked_at`) |
| **P6** | Fahrt bleibt leer | T-24 h: 0 zahlende Mitfahrer | Kein Geld im Spiel | Initiator erhält Wahl-E-Mail: absagen oder offen lassen. Bei Abfahrt ohne Mitfahrer: Auto-Absage, keinerlei Kosten |
| **P7** | Plattform storniert | jederzeit | Volle Rückerstattung an alle | Admin-Funktion (Betrug, höhere Gewalt) |
| **P8** | Problem gemeldet („Fahrt fand nicht statt") | bis 48 h nach Abfahrt | **Auszahlung der ganzen Gruppe pausiert**, bis ein Admin entscheidet: `resolved_refund` (Melder wird erstattet) oder `resolved_payout` (Auszahlung läuft) | Kartenrückbuchungen (Chargebacks) erzeugen automatisch einen Dispute |

### Feste Parameter (in `policy.ts`)

| Parameter | Wert |
|---|---|
| Kostenlose Stornierung bis | 24 h vor Abfahrt |
| Auszahlung an Initiator | 48 h nach Abfahrt (Dispute-Fenster) |
| Takeover-Fenster | 12 h (max. bis zum 24-h-Cutoff) |
| Seat-Reservierung beim Checkout | 30 min |
| Mindestvorlauf für Erstellen/Beitreten | 60 min |
| Strikes bis Sperrung | 3 |
| Servicegebühr | 20 % |
| Zahlungsmethoden | Karte, Apple Pay, Google Pay — **kein SEPA** (8-Wochen-Rückbuchungsrecht kollidiert mit Einbehalt) |

## Warum dieses Zahlungsmodell

Sofortige Abbuchung + „Separate Charges & Transfers": Das Geld liegt bis nach
der Fahrt auf dem Plattform-Konto — dadurch ist jedes Storno eine simple
Stripe-Rückerstattung, die Auszahlung an den Initiator ein einfacher Transfer,
und ein Initiator-Wechsel (P4) berührt Stripe gar nicht. Karten-Vorautorisierungen
(v1) verfallen nach 7 Tagen und sind für Fahrten mit längerem Vorlauf unbrauchbar.
Hinweis Rückerstattungen: Stripe erstattet die eigenen Prozessgebühren nicht
(~1,5 % + €0,25) — dieser Verlust bei P1/P4/P5-Stornos ist in der 20%-Marge einkalkuliert.
