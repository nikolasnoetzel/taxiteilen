import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory cache (per isolate, refreshed every 5 min)
let cache: { data: any[]; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Mock flights as fallback
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

function mapStatus(status: string): "on-time" | "delayed" | "landed" | "cancelled" {
  const s = (status || "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("land") || s.includes("arrived")) return "landed";
  if (s.includes("delay")) return "delayed";
  return "on-time";
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

async function fetchFromHamburgAPI(airportCode: string) {
  const apiKey = Deno.env.get("HAMBURG_AIRPORT_API_KEY");
  if (!apiKey || airportCode !== "HAM") return null;

  try {
    const res = await fetch(
      "https://rest.api.hamburg-airport.de/v2/flights/arrivals",
      {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      console.error(`Hamburg API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const raw = await res.json();
    const flights = Array.isArray(raw) ? raw : raw.arrivals || raw.data || [];

    return flights.map((f: any) => ({
      flightNumber: f.flightNumber || f.flight_number || f.flnr || "",
      airline: f.airline || f.airlineName || f.carrier || "",
      scheduledArrival: formatTime(f.scheduledTime || f.scheduled || f.sdt),
      estimatedArrival: formatTime(f.estimatedTime || f.estimated || f.edt || f.scheduledTime || f.scheduled || f.sdt),
      status: mapStatus(f.status || f.flightStatus || ""),
      origin: f.origin || f.departure || f.fromCity || "",
      originCode: f.originCode || f.departureCode || f.fromIata || "",
      gate: f.gate || f.gateNumber || null,
      terminal: f.terminal || f.terminalName || null,
    })).filter((f: any) => f.flightNumber && f.scheduledArrival);
  } catch (err) {
    console.error("Hamburg API fetch error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const airportCode = (url.searchParams.get("airport") || "HAM").toUpperCase();

    // Check cache
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ flights: cache.data, source: "cache" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try Hamburg Airport API
    const liveFlights = await fetchFromHamburgAPI(airportCode);

    if (liveFlights && liveFlights.length > 0) {
      cache = { data: liveFlights, ts: Date.now() };
      return new Response(JSON.stringify({ flights: liveFlights, source: "hamburg-api" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to mock data
    console.log("Using mock flight data as fallback");
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
