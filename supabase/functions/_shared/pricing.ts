// Single source of truth for all money math on the platform.
// Pure module (no Deno/Node APIs) — unit-tested via Vitest from src/test.
//
// Semantics (docs/policies.md):
// - Every route has a fixed total price. The seat price is frozen when a ride
//   is created: fixed_price / seats_total (initiator absorbs the rounding).
// - A rider pays share + 20% platform fee. The initiator receives the full
//   share on payout; the platform keeps the fee.

export const PLATFORM_FEE_PERCENT = 20;
export const CURRENCY = "eur";

export function seatPriceCents(fixedPriceCents: number, seatsTotal: number): number {
  if (seatsTotal < 2) throw new Error("seats_total must be at least 2");
  return Math.round(fixedPriceCents / seatsTotal);
}

export interface RiderCharge {
  /** transferred to the initiator after the ride */
  share_cents: number;
  /** kept by the platform */
  fee_cents: number;
  /** what the rider pays at checkout: share + fee */
  amount_cents: number;
}

export function riderCharge(seatPrice: number, numPersons: number): RiderCharge {
  if (numPersons < 1) throw new Error("num_persons must be at least 1");
  const share_cents = seatPrice * numPersons;
  const fee_cents = Math.round((share_cents * PLATFORM_FEE_PERCENT) / 100);
  return { share_cents, fee_cents, amount_cents: share_cents + fee_cents };
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
