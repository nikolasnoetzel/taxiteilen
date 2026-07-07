import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, MapPin, Plane, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoutes } from "@/hooks/use-routes";
import { directionalRoutes } from "@/lib/directions";
import { cn } from "@/lib/utils";

/**
 * Airbnb-style segmented search: Von / Nach / Datum / CTA.
 * "Von"/"Nach" are constrained to places with active routes.
 */
export function SearchBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data: routes } = useRoutes();
  const options = useMemo(() => directionalRoutes(routes ?? []), [routes]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const selected = options.find((o) => o.key === selectedKey) ?? null;
  const froms = useMemo(
    () => [...new Map(options.map((o) => [o.from, o])).keys()],
    [options]
  );
  const tosForFrom = useMemo(
    () => options.filter((o) => !selected || o.from === selected.from),
    [options, selected]
  );

  const setFrom = (from: string) => {
    const first = options.find((o) => o.from === from);
    if (first) setSelectedKey(first.key);
  };
  const swap = () => {
    if (!selected) return;
    const reversed = options.find((o) => o.from === selected.to && o.to === selected.from);
    if (reversed) setSelectedKey(reversed.key);
  };

  const search = () => {
    const params = new URLSearchParams();
    if (selected) {
      params.set("route", selected.route.id);
      params.set("richtung", selected.direction);
    }
    if (date) params.set("datum", date);
    navigate(`/suche?${params.toString()}`);
  };

  const seg =
    "flex items-center gap-2.5 px-4 md:px-5 py-3 min-w-0 flex-1";
  const segLabel = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
  const segSelect =
    "w-full bg-transparent text-sm font-semibold outline-none cursor-pointer appearance-none";

  return (
    <div
      className={cn(
        "bg-card rounded-3xl md:rounded-full shadow-lift-lg border border-border/70 p-2 flex flex-col md:flex-row md:items-center gap-1",
        className
      )}
    >
      <div className={seg}>
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className={segLabel}>Von</p>
          <select
            className={segSelect}
            value={selected?.from ?? ""}
            onChange={(e) => setFrom(e.target.value)}
          >
            <option value="" disabled>Startort wählen</option>
            {froms.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={swap}
        className="hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border hover:border-foreground transition-colors"
        aria-label="Richtung tauschen"
        type="button"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
      </button>

      <div className={cn(seg, "border-t md:border-t-0 md:border-l border-border/70")}>
        <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className={segLabel}>Nach</p>
          <select
            className={segSelect}
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            disabled={!selected}
          >
            <option value="" disabled>Ziel wählen</option>
            {tosForFrom.map((o) => (
              <option key={o.key} value={o.key}>{o.to}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={cn(seg, "border-t md:border-t-0 md:border-l border-border/70")}>
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className={segLabel}>Datum</p>
          <input
            type="date"
            className="w-full bg-transparent text-sm font-semibold outline-none"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <Button size="lg" className="md:rounded-full m-1 md:m-0 shrink-0" onClick={search}>
        <Search /> Fahrten finden
      </Button>
    </div>
  );
}
