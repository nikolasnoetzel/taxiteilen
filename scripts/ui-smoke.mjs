#!/usr/bin/env node
// UI-Smoke-Test ohne Backend: startet den Vite-Dev-Server, fängt alle
// Supabase-REST-Calls mit Fixtures ab und prüft die Kernseiten (Landing,
// Suche, Fahrt-Detail, AGB) auf korrektes Rendering — inklusive der
// 15%-Preislogik. Screenshots landen in SCREEN_DIR (Default: ./ui-smoke-out).
//
//   node scripts/ui-smoke.mjs
//
// Exit-Code 0 = alle Checks grün.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 5199;
// 127.0.0.1 statt localhost: Sandbox-Container ohne IPv6 (:: schlägt fehl)
const BASE = `http://127.0.0.1:${PORT}`;
const SCREEN_DIR = process.env.SCREEN_DIR || "./ui-smoke-out";
mkdirSync(SCREEN_DIR, { recursive: true });

// ---------- Fixtures (Kiel ↔ HAM, €150, 4 Plätze → 37,50 € + 15 % = 43,13 €) ----------
const HUB = { id: "hub-1", code: "HAM", name: "Hamburg Airport", city_name: "Hamburg", active: true };
const CITY = { id: "city-1", slug: "kiel", name: "Kiel", active: true };
const ROUTE = {
  id: "rt-1", hub_id: "hub-1", city_id: "city-1", fixed_price_cents: 15000,
  duration_min: 70, distance_km: 90, active: true, hubs: HUB, cities: CITY,
};
const departure = new Date(Date.now() + 72 * 3600_000);
const GROUP = {
  id: "rg-1", route_id: "rt-1", direction: "to_hub",
  departure_at: departure.toISOString(), meeting_point: "Kiel Hbf, Haupteingang",
  seats_total: 4, seat_price_cents: 3750, initiator_id: "user-ina", status: "open",
  cancel_reason: null, takeover_deadline: null, locked_at: null,
  payout_due_at: new Date(departure.getTime() + 48 * 3600_000).toISOString(),
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};
const MEMBERSHIPS = [
  { id: "mem-1", ride_group_id: "rg-1", user_id: "user-ina", role: "initiator", status: "active",
    num_persons: 1, pending_expires_at: null, joined_at: new Date().toISOString(), cancelled_at: null },
];
const PROFILES = [{ user_id: "user-ina", full_name: "Ina Beispiel" }];

const fixtures = (pathname) => {
  if (pathname.includes("/rest/v1/routes")) return [ROUTE];
  if (pathname.includes("/rest/v1/ride_groups")) return [{ ...GROUP, memberships: MEMBERSHIPS.map((m) => ({ num_persons: m.num_persons, status: m.status })) }];
  if (pathname.includes("/rest/v1/memberships")) return MEMBERSHIPS;
  if (pathname.includes("/rest/v1/profiles")) return PROFILES;
  return [];
};

// ---------- Dev-Server ----------
const vite = spawn("npx", ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { stdio: "pipe" });
const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch { /* noch nicht oben */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Vite-Dev-Server kam nicht hoch");
};

// ---------- Checks ----------
const failures = [];
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, err: String(err).split("\n")[0] });
    console.log(`  ✗ ${name}: ${String(err).split("\n")[0]}`);
  }
};

try {
  await waitForServer();
  // In der Claude-Sandbox liegt Chromium versionsunabhängig unter /opt/pw-browsers/chromium
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH || (await import("node:fs")).existsSync("/opt/pw-browsers/chromium")
      ? { executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" }
      : {}
  );
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  await context.route("**/*.supabase.co/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/auth/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    const rows = fixtures(url.pathname);
    const wantsObject = (route.request().headers()["accept"] ?? "").includes("pgrst.object");
    const body = wantsObject ? JSON.stringify(rows[0] ?? null) : JSON.stringify(rows);
    if (wantsObject && rows.length === 0) {
      return route.fulfill({ status: 406, contentType: "application/json", body: JSON.stringify({ message: "no rows" }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body });
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  // 1. Landing
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  // Unterhalb des Folds animiert framer-motion per whileInView — die Knoten
  // sind da, aber (noch) nicht "visible"; daher state: attached prüfen.
  await check("Landing: Beliebte Strecken mit Routen-Karte", async () => {
    await page.getByText("Beliebte Strecken", { exact: false }).first().waitFor({ state: "attached", timeout: 15000 });
    await page.getByText("Hamburg Airport", { exact: false }).first().waitFor({ state: "attached", timeout: 15000 });
  });
  await check("Landing: Preis pro Person = 43,13 € (37,50 € + 15 %)", () =>
    page.getByText("43,13", { exact: false }).first().waitFor({ timeout: 15000 }));
  await check("Landing: 15 %-Servicegebühr kommuniziert", () =>
    page.getByText("15 % Servicegebühr", { exact: false }).first().waitFor({ timeout: 5000 }));
  await page.screenshot({ path: `${SCREEN_DIR}/landing.png`, fullPage: false });

  // 2. Suche
  await page.goto(`${BASE}/suche?route=rt-1&richtung=to_hub`, { waitUntil: "domcontentloaded" });
  await check("Suche: Fahrt-Karte mit 3 freien Plätzen", () =>
    page.getByText("3 Plätze frei", { exact: false }).first().waitFor({ timeout: 15000 }));
  await page.screenshot({ path: `${SCREEN_DIR}/suche.png` });

  // 3. Fahrt-Detail (ausgeloggt)
  await page.goto(`${BASE}/fahrt/rg-1`, { waitUntil: "domcontentloaded" });
  await check("Detail: Treffpunkt sichtbar", () =>
    page.getByText("Kiel Hbf", { exact: false }).first().waitFor({ timeout: 15000 }));
  await check("Detail: Preisaufschlüsselung zeigt 15 % Gebühr", () =>
    page.getByText("Servicegebühr (15 %)", { exact: false }).first().waitFor({ timeout: 5000 }));
  await check("Detail: Gesamtpreis 43,13 €", () =>
    page.getByText("43,13", { exact: false }).first().waitFor({ timeout: 5000 }));
  await page.screenshot({ path: `${SCREEN_DIR}/detail.png`, fullPage: true });

  // 4. AGB
  await page.goto(`${BASE}/agb`, { waitUntil: "domcontentloaded" });
  await check("AGB: 15 %-Servicegebühr in §5", () =>
    page.getByText("Servicegebühr von 15 %", { exact: false }).first().waitFor({ timeout: 10000 }));
  await check("AGB: Beispielrechnung 34,50 €", () =>
    page.getByText("34,50", { exact: false }).first().waitFor({ timeout: 5000 }));
  await page.screenshot({ path: `${SCREEN_DIR}/agb.png` });

  await check("Keine unbehandelten Seitenfehler", () => {
    const relevant = consoleErrors.filter((e) => !e.includes("WebSocket") && !e.includes("realtime"));
    if (relevant.length) throw new Error(relevant.join(" | "));
    return Promise.resolve();
  });

  await browser.close();
} finally {
  vite.kill("SIGTERM");
}

if (failures.length) {
  console.error(`\n${failures.length} Check(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nAlle UI-Smoke-Checks grün.");
