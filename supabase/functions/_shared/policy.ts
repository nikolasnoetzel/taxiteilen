// Cancellation & payout policy constants and helpers (docs/policies.md P1–P8).
// Pure module (no Deno/Node APIs) — unit-tested via Vitest from src/test.
// Cutoffs are ONLY evaluated server-side (edge functions); the frontend may
// display them but never decides.

/** Free cancellation until this many hours before departure (P1/P2). */
export const CANCEL_CUTOFF_HOURS = 24;
/** Transfers to the initiator run this many hours after departure (dispute window, P8). */
export const PAYOUT_DELAY_HOURS = 48;
/** How long riders get to take over a ride the initiator cancelled (P4). */
export const TAKEOVER_WINDOW_HOURS = 12;
/** A pending checkout reserves the seat for this long. */
export const PENDING_PAYMENT_TTL_MINUTES = 30;
/** Joining/creating requires at least this much lead time before departure. */
export const MIN_LEAD_TIME_MINUTES = 60;
/** Strikes until an initiator is blocked (P5). */
export const STRIKES_UNTIL_BLOCKED = 3;

export function hoursToDeparture(departureAtIso: string, now: Date = new Date()): number {
  return (new Date(departureAtIso).getTime() - now.getTime()) / 3_600_000;
}

/** P1 vs P2: is cancelling now free (full refund)? */
export function isFreeCancellation(departureAtIso: string, now: Date = new Date()): boolean {
  return hoursToDeparture(departureAtIso, now) >= CANCEL_CUTOFF_HOURS;
}

export function payoutDueAt(departureAtIso: string): Date {
  return new Date(new Date(departureAtIso).getTime() + PAYOUT_DELAY_HOURS * 3_600_000);
}

/**
 * P4: the takeover window ends after TAKEOVER_WINDOW_HOURS, but never later
 * than the free-cancellation cutoff (riders must keep their P1 exit).
 */
export function takeoverDeadline(departureAtIso: string, now: Date = new Date()): Date {
  const windowEnd = now.getTime() + TAKEOVER_WINDOW_HOURS * 3_600_000;
  const cutoff = new Date(departureAtIso).getTime() - CANCEL_CUTOFF_HOURS * 3_600_000;
  return new Date(Math.min(windowEnd, cutoff));
}
