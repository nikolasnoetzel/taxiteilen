// All commercially served airports in Germany with IATA codes
export type AirportEntry = {
  iata: string;
  name: string;
  city: string;
  lat: string;
  lon: string;
};

export const GERMAN_AIRPORTS: AirportEntry[] = [
  { iata: "HAM", name: "Flughafen Hamburg", city: "Hamburg", lat: "53.6304", lon: "10.0065" },
  { iata: "FRA", name: "Flughafen Frankfurt am Main", city: "Frankfurt", lat: "50.0379", lon: "8.5622" },
  { iata: "MUC", name: "Flughafen München", city: "München", lat: "48.3538", lon: "11.7861" },
  { iata: "BER", name: "Flughafen Berlin Brandenburg", city: "Berlin", lat: "52.3667", lon: "13.5033" },
  { iata: "DUS", name: "Flughafen Düsseldorf", city: "Düsseldorf", lat: "51.2895", lon: "6.7668" },
  { iata: "CGN", name: "Flughafen Köln/Bonn", city: "Köln", lat: "50.8659", lon: "7.1427" },
  { iata: "STR", name: "Flughafen Stuttgart", city: "Stuttgart", lat: "48.6899", lon: "9.2220" },
  { iata: "HAJ", name: "Flughafen Hannover", city: "Hannover", lat: "52.4611", lon: "9.6850" },
  { iata: "NUE", name: "Flughafen Nürnberg", city: "Nürnberg", lat: "49.4987", lon: "11.0669" },
  { iata: "LEJ", name: "Flughafen Leipzig/Halle", city: "Leipzig", lat: "51.4324", lon: "12.2416" },
  { iata: "BRE", name: "Flughafen Bremen", city: "Bremen", lat: "53.0475", lon: "8.7867" },
  { iata: "DRS", name: "Flughafen Dresden", city: "Dresden", lat: "51.1328", lon: "13.7672" },
  { iata: "DTM", name: "Flughafen Dortmund", city: "Dortmund", lat: "51.5183", lon: "7.6122" },
  { iata: "FMO", name: "Flughafen Münster/Osnabrück", city: "Münster", lat: "52.1346", lon: "7.6848" },
  { iata: "PAD", name: "Flughafen Paderborn/Lippstadt", city: "Paderborn", lat: "51.6141", lon: "8.6163" },
  { iata: "SCN", name: "Flughafen Saarbrücken", city: "Saarbrücken", lat: "49.2146", lon: "7.1095" },
  { iata: "FDH", name: "Flughafen Friedrichshafen", city: "Friedrichshafen", lat: "47.6713", lon: "9.5115" },
  { iata: "KSF", name: "Flughafen Kassel-Calden", city: "Kassel", lat: "51.4083", lon: "9.3775" },
  { iata: "ERF", name: "Flughafen Erfurt-Weimar", city: "Erfurt", lat: "50.9798", lon: "10.9581" },
  { iata: "RLG", name: "Flughafen Rostock-Laage", city: "Rostock", lat: "53.9182", lon: "12.2783" },
  { iata: "FKB", name: "Flughafen Karlsruhe/Baden-Baden", city: "Karlsruhe", lat: "48.7794", lon: "8.0805" },
  { iata: "MME", name: "Flughafen Memmingen", city: "Memmingen", lat: "47.9888", lon: "10.2395" },
  { iata: "LBC", name: "Flughafen Lübeck", city: "Lübeck", lat: "53.8054", lon: "10.7192" },
  { iata: "HHN", name: "Flughafen Frankfurt-Hahn", city: "Hahn", lat: "49.9487", lon: "7.2639" },
  { iata: "NRN", name: "Flughafen Weeze (Niederrhein)", city: "Weeze", lat: "51.6024", lon: "6.1422" },
  { iata: "SXF", name: "Flughafen Berlin-Schönefeld (historisch)", city: "Berlin", lat: "52.3800", lon: "13.5225" },
];

/** Search airports by IATA code or name/city */
export function searchAirports(query: string): AirportEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return GERMAN_AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase().startsWith(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
  ).slice(0, 5);
}
