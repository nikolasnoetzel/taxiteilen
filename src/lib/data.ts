export type Route = {
  id: string;
  from: string;
  fromShort: string;
  to: string;
  toShort: string;
  airport: string;
  airportCode: string;
  estimatedPrice: { min: number; max: number };
  estimatedDuration: string;
  taxiCompanies: TaxiCompany[];
};

export type TaxiCompany = {
  name: string;
  phone: string;
  description: string;
};

export type RideRequest = {
  id: string;
  routeId: string;
  flightNumber: string;
  flightStatus: "on-time" | "delayed" | "landed" | "cancelled";
  scheduledArrival: string;
  estimatedArrival: string;
  userName: string;
  isInitiator: boolean;
  createdAt: string;
};

export type RideGroup = {
  id: string;
  routeId: string;
  flightNumber: string;
  members: RideRequest[];
  status: "open" | "confirmed" | "completed" | "cancelled";
  totalCost: number;
  serviceFee: number;
};

export const ROUTES: Route[] = [
  {
    id: "ham-kiel",
    from: "Flughafen Hamburg (HAM)",
    fromShort: "HAM",
    to: "Kiel Innenstadt",
    toShort: "Kiel",
    airport: "Hamburg Airport",
    airportCode: "HAM",
    estimatedPrice: { min: 100, max: 150 },
    estimatedDuration: "ca. 1 Std. 15 Min.",
    taxiCompanies: [
      {
        name: "Vineta Taxi",
        phone: "+4943177070",
        description: "Zuverlässiger Taxiservice in Kiel mit Flughafentransfer-Erfahrung.",
      },
      {
        name: "Mare Taxi Kiel",
        phone: "+4943177070",
        description: "Komfortabler Taxi-Service für Langstrecken ab Kiel.",
      },
    ],
  },
  {
    id: "kiel-ham",
    from: "Kiel Innenstadt",
    fromShort: "Kiel",
    to: "Flughafen Hamburg (HAM)",
    toShort: "HAM",
    airport: "Hamburg Airport",
    airportCode: "HAM",
    estimatedPrice: { min: 100, max: 150 },
    estimatedDuration: "ca. 1 Std. 15 Min.",
    taxiCompanies: [
      {
        name: "Vineta Taxi",
        phone: "+4943177070",
        description: "Zuverlässiger Taxiservice in Kiel mit Flughafentransfer-Erfahrung.",
      },
      {
        name: "Mare Taxi Kiel",
        phone: "+4943177070",
        description: "Komfortabler Taxi-Service für Langstrecken ab Kiel.",
      },
    ],
  },
];

// Flight data type matching Hamburg Airport API structure for easy swap later
export type Flight = {
  flightNumber: string;
  airline: string;
  scheduledArrival: string;
  estimatedArrival: string;
  status: "on-time" | "delayed" | "landed" | "cancelled";
  origin: string;
  originCode: string;
  gate?: string;
  terminal?: string;
};

// Realistic mock flights for Hamburg Airport (HAM)
// Will be replaced by Hamburg Airport API: GET https://rest.api.hamburg-airport.de/v2/flights/arrivals
export const MOCK_FLIGHTS: Flight[] = [
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

// Mock ride requests
export const MOCK_RIDE_REQUESTS: RideRequest[] = [
  {
    id: "r1",
    routeId: "ham-kiel",
    flightNumber: "LH 2084",
    flightStatus: "on-time",
    scheduledArrival: "14:30",
    estimatedArrival: "14:30",
    userName: "Anna M.",
    isInitiator: false,
    createdAt: "2026-03-11T10:00:00Z",
  },
  {
    id: "r2",
    routeId: "ham-kiel",
    flightNumber: "LH 2084",
    flightStatus: "on-time",
    scheduledArrival: "14:30",
    estimatedArrival: "14:30",
    userName: "Thomas K.",
    isInitiator: true,
    createdAt: "2026-03-11T09:30:00Z",
  },
  {
    id: "r3",
    routeId: "ham-kiel",
    flightNumber: "EW 7542",
    flightStatus: "delayed",
    scheduledArrival: "15:10",
    estimatedArrival: "15:45",
    userName: "Lisa B.",
    isInitiator: false,
    createdAt: "2026-03-11T11:00:00Z",
  },
];

export function getCostPerPerson(totalCost: number, numPeople: number): number {
  const serviceFee = totalCost * 0.1;
  return Math.ceil((totalCost + serviceFee) / numPeople);
}

export function formatPhone(phone: string): string {
  return phone.replace(/\+49(\d{3})(\d+)/, "0$1 $2");
}
