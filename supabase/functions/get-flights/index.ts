const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory cache (per isolate, refreshed every 5 min)
let cache: { data: any[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

const MOCK_FLIGHTS = [
  { flightNumber: "LH 2084", airline: "Lufthansa", scheduledArrival: "14:30", estimatedArrival: "14:30", status: "on-time", origin: "München", originCode: "MUC", gate: "B12", terminal: "T1" },
  { flightNumber: "EW 7542", airline: "Eurowings", scheduledArrival: "15:10", estimatedArrival: "15:45", status: "delayed", origin: "Stuttgart", originCode: "STR", gate: "A04", terminal: "T2" },
  { flightNumber: "LH 2090", airline: "Lufthansa", scheduledArrival: "16:00", estimatedArrival: "16:00", status: "on-time", origin: "Frankfurt", originCode: "FRA", gate: "B08", terminal: "T1" },
  { flightNumber: "FR 4812", airline: "Ryanair", scheduledArrival: "16:45", estimatedArrival: "16:45", status: "on-time", origin: "London Stansted", originCode: "STN", gate: "C02", terminal: "T2" },
  { flightNumber: "EW 7550", airline: "Eurowings", scheduledArrival: "17:20", estimatedArrival: "17:20", status: "on-time", origin: "Düsseldorf", originCode: "DUS", gate: "A06", terminal: "T2" },
  { flightNumber: "LH 2092", airline: "Lufthansa", scheduledArrival: "18:05", estimatedArrival: "18:05", status: "on-time", origin: "Wien", originCode: "VIE", gate: "B14", terminal: "T1" },
  { flightNumber: "SK 672", airline: "SAS", scheduledArrival: "18:40", estimatedArrival: "18:40", status: "on-time", origin: "Kopenhagen", originCode: "CPH", gate: "A10", terminal: "T2" },
  { flightNumber: "EK 060", airline: "Emirates", scheduledArrival: "19:15", estimatedArrival: "19:30", status: "delayed", origin: "Dubai", originCode: "DXB", gate: "B02", terminal: "T1" },
  { flightNumber: "EW 7558", airline: "Eurowings", scheduledArrival: "20:00", estimatedArrival: "20:00", status: "on-time", origin: "Palma de Mallorca", originCode: "PMI", gate: "C06", terminal: "T2" },
  { flightNumber: "LH 2096", airline: "Lufthansa", scheduledArrival: "21:30", estimatedArrival: "21:30", status: "on-time", origin: "Zürich", originCode: "ZRH", gate: "B10", terminal: "T1" },
];

function formatHamburgTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const cleaned = dateStr.replace(/\[.*\]$/, "");
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function mapHamburgStatus(f: any): string {
  if (f.cancelled) return "cancelled";
  const s = (f.flightStatusArrival || "").toUpperCase();
  if (s === "CNX" || s === "CAN") return "cancelled";
  if (s === "LND" || s === "ARR") return "landed";
  if (s === "DEL") return "delayed";
  if (f.expectedArrivalTime && f.plannedArrivalTime) {
    try {
      const planned = new Date(f.plannedArrivalTime.replace(/\[.*\]$/, ""));
      const expected = new Date(f.expectedArrivalTime.replace(/\[.*\]$/, ""));
      const diffMin = (expected.getTime() - planned.getTime()) / 60000;
      // Only "delayed" if arriving MORE than 10 min late (not early)
      if (diffMin > 10) return "delayed";
    } catch { /* ignore */ }
  }
  return "on-time";
}

async function fetchFromHamburgAPI(airportCode: string) {
  const apiKey = Deno.env.get("HAMBURG_AIRPORT_API_KEY");
  if (!apiKey || airportCode !== "HAM") return null;

  try {
    const res = await fetch("https://rest.api.hamburg-airport.de/v2/flights/arrivals", {
      headers: { "Ocp-Apim-Subscription-Key": apiKey, Accept: "application/json" },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Hamburg API error: ${res.status} - ${body.substring(0, 200)}`);
      return null;
    }

    const raw = await res.json();
    const items = Array.isArray(raw) ? raw : raw.arrivals || raw.data || raw.flights || [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const todayItems = items.filter((f: any) => {
      const t = (f.plannedArrivalTime || "").substring(0, 10);
      return t === todayStr;
    });

    console.log(`Hamburg API: ${items.length} total, ${todayItems.length} today`);

    const mapped = todayItems.map((f: any) => ({
      flightNumber: (f.flightnumber || "").trim(),
      airline: f.airlineName || "",
      scheduledArrival: formatHamburgTime(f.plannedArrivalTime || ""),
      estimatedArrival: formatHamburgTime(f.expectedArrivalTime || f.plannedArrivalTime || ""),
      status: mapHamburgStatus(f),
      origin: f.originAirportName || "",
      originCode: f.originAirport3LCode || "",
      gate: null,
      terminal: f.arrivalTerminal || null,
    })).filter((f: any) => f.flightNumber && f.scheduledArrival)
      .sort((a: any, b: any) => a.scheduledArrival.localeCompare(b.scheduledArrival));

    console.log(`Hamburg API: ${mapped.length} mapped flights for today`);
    return mapped.length > 0 ? mapped : null;
  } catch (err) {
    console.error("Hamburg API fetch error:", err);
    return null;
  }
}

async function fetchFromAviationStack(airportCode: string) {
  const apiKey = Deno.env.get("AVIATIONSTACK_API_KEY");
  if (!apiKey) return null;

  try {
    // Free plan only supports HTTP
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&arr_iata=${airportCode}&flight_status=active,scheduled,landed&limit=100`;
    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      console.error(`AviationStack error: ${res.status} - ${body.substring(0, 200)}`);
      return null;
    }

    const json = await res.json();
    if (json.error) {
      console.error(`AviationStack API error: ${JSON.stringify(json.error)}`);
      return null;
    }

    const items = json.data || [];
    console.log(`AviationStack: ${items.length} flights for ${airportCode}`);

    const mapped = items.map((f: any) => {
      const scheduled = f.arrival?.scheduled || "";
      const estimated = f.arrival?.estimated || f.arrival?.scheduled || "";
      const status = mapAviationStackStatus(f);

      return {
        flightNumber: `${f.airline?.iata || ""} ${f.flight?.number || ""}`.trim(),
        airline: f.airline?.name || "",
        scheduledArrival: formatISOTime(scheduled),
        estimatedArrival: formatISOTime(estimated),
        status,
        origin: f.departure?.airport || "",
        originCode: f.departure?.iata || "",
        gate: f.arrival?.gate || null,
        terminal: f.arrival?.terminal || null,
      };
    }).filter((f: any) => f.flightNumber && f.scheduledArrival)
      .sort((a: any, b: any) => a.scheduledArrival.localeCompare(b.scheduledArrival));

    console.log(`AviationStack: ${mapped.length} mapped flights`);
    return mapped.length > 0 ? mapped : null;
  } catch (err) {
    console.error("AviationStack fetch error:", err);
    return null;
  }
}

function formatISOTime(isoStr: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function mapAviationStackStatus(f: any): string {
  const s = (f.flight_status || "").toLowerCase();
  if (s === "cancelled") return "cancelled";
  if (s === "landed") return "landed";
  if (s === "diverted") return "cancelled";
  if (f.arrival?.delay && f.arrival.delay > 10) return "delayed";
  return "on-time";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const airportCode = (url.searchParams.get("airport") || "HAM").toUpperCase();

    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ flights: cache.data, source: "cache" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const liveFlights = await fetchFromHamburgAPI(airportCode);

    if (liveFlights) {
      cache = { data: liveFlights, ts: Date.now() };
      return new Response(JSON.stringify({ flights: liveFlights, source: "hamburg-api" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fallback to mock data");
    return new Response(JSON.stringify({ flights: MOCK_FLIGHTS, source: "mock" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ flights: MOCK_FLIGHTS, source: "mock-error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
