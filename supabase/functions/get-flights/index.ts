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

function mapHamburgStatus(f: any): "on-time" | "delayed" | "landed" | "cancelled" {
  if (f.cancelled) return "cancelled";
  const s = (f.flightStatusArrival || "").toUpperCase();
  // HAM statuses: ONB (on board/en route), LND (landed), DEL (delayed), CNX (cancelled), etc.
  if (s === "CNX" || s === "CAN") return "cancelled";
  if (s === "LND" || s === "ARR") return "landed";
  if (s === "DEL") return "delayed";
  // Check if estimated differs significantly from planned
  if (f.expectedArrivalTime && f.plannedArrivalTime) {
    try {
      const planned = new Date(f.plannedArrivalTime.replace(/\[.*\]$/, ""));
      const expected = new Date(f.expectedArrivalTime.replace(/\[.*\]$/, ""));
      if (Math.abs(expected.getTime() - planned.getTime()) > 10 * 60 * 1000) return "delayed";
    } catch {}
  }
  return "on-time";
}

function formatHamburgTime(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    // Remove timezone ID like [Europe/Berlin]
    const cleaned = dateStr.replace(/\[.*\]$/, "");
    const d = new Date(cleaned);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}
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
    const apiUrl = "https://rest.api.hamburg-airport.de/v2/flights/arrivals";
    console.log(`Fetching Hamburg API: ${apiUrl} with key: ${apiKey.substring(0, 6)}...`);
    
    const res = await fetch(apiUrl, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        Accept: "application/json",
      },
    });

    console.log(`Hamburg API response status: ${res.status}`);
    
    if (!res.ok) {
      const body = await res.text();
      console.error(`Hamburg API error: ${res.status} ${res.statusText} - ${body}`);
      return null;
    }

    const raw = await res.json();
    console.log(`Hamburg API raw response type: ${typeof raw}, isArray: ${Array.isArray(raw)}, keys: ${typeof raw === 'object' ? Object.keys(raw).join(',') : 'n/a'}`);
    
    // Log first item to understand structure
    const items = Array.isArray(raw) ? raw : raw.arrivals || raw.data || raw.flights || [];
    console.log(`Hamburg API items count: ${items.length}`);
    if (items.length > 0) {
      console.log(`First item keys: ${Object.keys(items[0]).join(',')}`);
      console.log(`First item sample: ${JSON.stringify(items[0]).substring(0, 500)}`);
    }

    const mapped = items.map((f: any) => ({
      flightNumber: f.flightNumber || f.flight_number || f.flnr || f.FlightNumber || f.flightNo || "",
      airline: f.airline || f.airlineName || f.carrier || f.Airline || "",
      scheduledArrival: formatTime(f.scheduledTime || f.scheduled || f.sdt || f.ScheduledTime || f.scheduledDateTime || ""),
      estimatedArrival: formatTime(f.estimatedTime || f.estimated || f.edt || f.EstimatedTime || f.expectedDateTime || f.scheduledTime || f.scheduled || f.sdt || f.ScheduledTime || ""),
      status: mapStatus(f.status || f.flightStatus || f.Status || f.FlightStatus || ""),
      origin: f.origin || f.departure || f.fromCity || f.Origin || f.DepartureCity || "",
      originCode: f.originCode || f.departureCode || f.fromIata || f.OriginCode || f.DepartureAirportCode || "",
      gate: f.gate || f.gateNumber || f.Gate || null,
      terminal: f.terminal || f.terminalName || f.Terminal || null,
    })).filter((f: any) => f.flightNumber && f.scheduledArrival);

    console.log(`Mapped flights count: ${mapped.length}`);
    return mapped;
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
