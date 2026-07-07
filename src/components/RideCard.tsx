import { Link } from "react-router-dom";
import { ArrowRight, Clock, Users } from "lucide-react";
import { RoutePath } from "@/components/RoutePath";
import { riderCharge, formatEuro } from "@/lib/pricing";
import { formatDate, formatTime } from "@/lib/format";
import type { RideGroupWithSeats } from "@/hooks/use-rides";
import type { RouteWithPlaces } from "@/hooks/use-routes";
import { cn } from "@/lib/utils";

/** Boarding-pass style ride card for search results & route sections. */
export function RideCard({
  ride,
  route,
  className,
}: {
  ride: RideGroupWithSeats;
  route: RouteWithPlaces;
  className?: string;
}) {
  const from = ride.direction === "to_hub" ? route.city.name : route.hub.name;
  const to = ride.direction === "to_hub" ? route.hub.name : route.city.name;
  const seatsLeft = Math.max(ride.seats_total - ride.seats_taken, 0);
  const price = riderCharge(ride.seat_price_cents, 1).amount_cents;

  return (
    <Link
      to={`/fahrt/${ride.id}`}
      className={cn(
        "group block bg-card rounded-2xl border border-border/70 shadow-lift hover:shadow-lift-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden",
        className
      )}
    >
      <div className="p-5 pb-4">
        <RoutePath from={from} to={to} compact />
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{formatDate(ride.departure_at)}</span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {formatTime(ride.departure_at)} Uhr
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {seatsLeft > 0 ? `${seatsLeft} ${seatsLeft === 1 ? "Platz" : "Plätze"} frei` : "Voll"}
          </span>
        </div>
      </div>

      <div className="ticket-notch border-t border-dashed border-border mx-0" />

      <div className="flex items-center justify-between p-5 pt-4">
        <div>
          <p className="font-display text-xl font-bold">{formatEuro(price)}</p>
          <p className="text-xs text-muted-foreground">pro Person, alles inklusive</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary group-hover:bg-accent transition-colors">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
