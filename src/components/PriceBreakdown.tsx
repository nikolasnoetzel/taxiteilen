import { riderCharge, formatEuro, PLATFORM_FEE_PERCENT } from "@/lib/pricing";

/** Transparent price breakdown shown before joining a ride. */
export function PriceBreakdown({
  seatPriceCents,
  numPersons,
}: {
  seatPriceCents: number;
  numPersons: number;
}) {
  const charge = riderCharge(seatPriceCents, numPersons);
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>
          Fahrtanteil ({numPersons} {numPersons === 1 ? "Person" : "Personen"} × {formatEuro(seatPriceCents)})
        </span>
        <span>{formatEuro(charge.share_cents)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Servicegebühr ({PLATFORM_FEE_PERCENT} %)</span>
        <span>{formatEuro(charge.fee_cents)}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-2 font-display text-base font-bold">
        <span>Gesamt</span>
        <span>{formatEuro(charge.amount_cents)}</span>
      </div>
    </div>
  );
}
