import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Plane, ArrowDownUp, CalendarIcon, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchAirports, type AirportEntry } from "@/lib/german-airports";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type AutocompleteItem =
  | { type: "airport"; data: AirportEntry }
  | { type: "place"; data: NominatimResult };

function useLocationAutocomplete() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((q: string) => {
    setQuery(q);
    setSelectedLabel("");
    if (q.length < 2) {
      setItems([]);
      setIsOpen(false);
      return;
    }

    // Immediately show airport matches
    const airportMatches: AutocompleteItem[] = searchAirports(q).map((a) => ({
      type: "airport",
      data: a,
    }));

    if (airportMatches.length > 0) {
      setItems(airportMatches);
      setIsOpen(true);
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=de&limit=5&addressdetails=0`,
          { headers: { "Accept-Language": "de" } }
        );
        const data: NominatimResult[] = await res.json();
        const placeItems: AutocompleteItem[] = data.map((d) => ({
          type: "place",
          data: d,
        }));
        // Airports first, then places (deduplicated)
        const combined = [...airportMatches, ...placeItems];
        setItems(combined.slice(0, 7));
        setIsOpen(combined.length > 0);
      } catch {
        // Keep airport results if fetch fails
        if (airportMatches.length === 0) setItems([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const selectItem = useCallback((item: AutocompleteItem) => {
    let label: string;
    if (item.type === "airport") {
      label = `${item.data.name} (${item.data.iata})`;
    } else {
      const parts = item.data.display_name.split(", ");
      label = parts.slice(0, 2).join(", ");
    }
    setSelectedLabel(label);
    setQuery(label);
    setIsOpen(false);
    return label;
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setSelectedLabel("");
    setItems([]);
    setIsOpen(false);
  }, []);

  return { query, items, isLoading, isOpen, setIsOpen, search, selectItem, clear, selectedLabel };
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const RideSearch = () => {
  const navigate = useNavigate();
  const from = useLocationAutocomplete();
  const to = useLocationAutocomplete();
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState("12:00");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) from.setIsOpen(false);
      if (toRef.current && !toRef.current.contains(e.target as Node)) to.setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSwap = () => {
    const fq = from.query;
    const tq = to.query;
    from.search(tq);
    to.search(fq);
    // Force the display values
    from.clear();
    to.clear();
    setTimeout(() => {
      from.search(tq);
      to.search(fq);
    }, 0);
  };

  const handleSearch = () => {
    if (!from.query || !to.query) return;
    const params = new URLSearchParams({
      from: from.query,
      to: to.query,
      date: format(date, "yyyy-MM-dd"),
      time,
    });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative z-10 -mt-12 px-4"
    >
      <div className="container mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl md:p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-card-foreground">
            Mitfahrgelegenheit suchen
          </h2>

          <div className="space-y-3">
            {/* From / To row */}
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-3">
                {/* From */}
                <div ref={fromRef} className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <input
                      type="text"
                      placeholder="Von (z.B. Kiel, Hamburg Flughafen)"
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      value={from.query}
                      onChange={(e) => from.search(e.target.value)}
                      onFocus={() => from.results.length > 0 && from.setIsOpen(true)}
                    />
                  </div>
                  {from.isOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-lg">
                      {from.results.map((r) => (
                        <button
                          key={r.place_id}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent/10"
                          onClick={() => from.select(r)}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{r.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* To */}
                <div ref={toRef} className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-destructive" />
                    <input
                      type="text"
                      placeholder="Nach (z.B. Hamburg Flughafen, Berlin)"
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      value={to.query}
                      onChange={(e) => to.search(e.target.value)}
                      onFocus={() => to.results.length > 0 && to.setIsOpen(true)}
                    />
                  </div>
                  {to.isOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-lg">
                      {to.results.map((r) => (
                        <button
                          key={r.place_id}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent/10"
                          onClick={() => to.select(r)}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{r.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Swap button */}
              <button
                onClick={handleSwap}
                className="mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Richtung tauschen"
              >
                <ArrowDownUp className="h-4 w-4" />
              </button>
            </div>

            {/* Date + Time row */}
            <div className="flex gap-3">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start gap-2 text-left text-sm font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {format(date, "EEE, dd. MMM yyyy", { locale: de })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) setDate(d);
                      setCalendarOpen(false);
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    locale={de}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-28 justify-start gap-2 text-sm font-normal"
                  >
                    <Clock className="h-4 w-4 text-primary" />
                    {time}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1" align="start">
                  <div className="max-h-48 overflow-y-auto">
                    {TIME_OPTIONS.map((t) => (
                      <button
                        key={t}
                        className={cn(
                          "flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent/10",
                          t === time && "bg-primary/10 font-medium text-primary"
                        )}
                        onClick={() => {
                          setTime(t);
                          setTimeOpen(false);
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search button */}
            <Button
              onClick={handleSearch}
              disabled={!from.query || !to.query}
              className="w-full gap-2 bg-primary font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] hover:brightness-110"
              size="lg"
            >
              <Search className="h-4 w-4" />
              Mitfahrer suchen
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default RideSearch;
