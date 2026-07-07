# Strecken & Festpreise

Festpreise sind **von uns gesetzt** (Tabelle `routes`, Spalte `fixed_price_cents`)
und bewusst am oberen Rand der recherchierten Marktpreise kalibriert, damit der
Initiator nicht draufzahlt. Ändern: einfach die Zeile in der `routes`-Tabelle
updaten (Supabase Studio) — bereits erstellte Fahrten behalten ihren eingefrorenen
Sitzpreis.

Recherche-Stand: 07.07.2026 (Websuche; Quellen unten).

| Strecke | Festpreis | Dauer | km | Marktpreise gefunden |
|---|---|---|---|---|
| Kiel ↔ Hamburg Airport (HAM) | **€150** | ~70 min | ~90 | €149–159 lokale Festpreis-Anbieter (4 Pax); Taxameter wäre ~€190–220; Transfer-Plattformen €250+ |
| München ↔ Flughafen München (MUC) | **€110** | ~40 min | ~38 | Offizieller Festpreis MUC↔Hbf €106 (beide Richtungen); Taxameter Innenstadt ~€90–120 |
| Frankfurt ↔ Flughafen Frankfurt (FRA) | **€50** | ~22 min | ~13 | Festpreis-Anbieter €44,99 (Stadt→FRA) / €49,99 (FRA→Stadt); Taxameter ~€35–45 |
| Düsseldorf ↔ Flughafen Düsseldorf (DUS) | **€35** | ~20 min | ~9 | Taxameter €20–35 je nach Stadtteil; offizieller Festpreis DUS↔Messe €25 |

Jede Strecke gilt für **beide Richtungen** (`ride_groups.direction`: `to_hub` / `from_hub`).

## Empfohlene Taxizentralen (Tabelle `taxi_companies`)

Faustregel (das „Kieler Prinzip"): Das Taxi aus der **Zubringerstadt** ist meist
günstiger als das aus der Hub-Stadt, weil Anfahrt/Rückfahrt für den Fahrer
besser passen. Deshalb sind die Unternehmen der Stadtseite mit `priority 1`
verknüpft, die der Hub-Stadt mit `priority 2`.

| Stadt | Unternehmen | Telefon |
|---|---|---|
| Kiel | Mare Taxi Kiel (Vineta) | +49 431 77070 |
| Kiel | Taxi Kiel eG | +49 431 680101 |
| Hamburg | Hansa-Taxi | +49 40 211211 |
| Hamburg | Taxi Hamburg 6x6 | +49 40 666666 |
| München | Taxi-München eG | +49 89 21610 |
| München | IsarFunk Taxizentrale | +49 89 450540 |
| Frankfurt | Taxi Frankfurt eG | +49 69 230001 |
| Frankfurt | Taxi-Vereinigung Frankfurt | +49 69 250001 |
| Düsseldorf | Taxi Düsseldorf eG | +49 211 33333 |
| Düsseldorf | Rhein-Taxi Düsseldorf | +49 211 212121 |

## Ausbau-Reihenfolge (Vorschlag)

1. Zubringerstädte für bestehende Hubs: Lübeck→HAM, Augsburg/Ingolstadt→MUC,
   Wiesbaden/Mainz/Darmstadt→FRA, Köln/Essen→DUS
2. Neue Hubs: CGN, BER, STR — jeweils mit 1–2 Zubringerstädten
3. Für jede neue Strecke: Festpreis recherchieren (lokale Festpreis-Anbieter,
   taxi-rechner.de), Taxizentrale der Stadtseite verifizieren, Zeile in
   `routes` + `taxi_companies` + `route_taxi_companies` einfügen und diese
   Datei ergänzen.

## Quellen

- Kiel: kieltaxi.com (€149), taxiunternehmen-luqman-ressul (€159), derhinbringer.de, airportservice-kiel.de
- München: taxi-muenchen.de/preise (€106 Festpreis), isarfunk.de/taxitarif, taxirechner.de
- Frankfurt: main-taxi-frankfurt.de (€44,99/€49,99), tv-ffm.de/preise-und-tarife
- Düsseldorf: dus.com/anreisen/taxi, taxi-rechner.de/flughafen-taxi/DUS
