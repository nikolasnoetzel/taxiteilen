// Cancellation policy — one test per policy row (docs/policies.md P1–P8).
import { describe, expect, it } from "vitest";
import {
  CANCEL_CUTOFF_HOURS,
  PAYOUT_DELAY_HOURS,
  TAKEOVER_WINDOW_HOURS,
  hoursToDeparture,
  isFreeCancellation,
  payoutDueAt,
  takeoverDeadline,
} from "../../supabase/functions/_shared/policy";

const H = 3_600_000;
const now = new Date("2026-07-07T12:00:00Z");
const departureIn = (hours: number) => new Date(now.getTime() + hours * H).toISOString();

describe("policy constants", () => {
  it("cutoff 24h, payout T+48h, takeover window 12h", () => {
    expect(CANCEL_CUTOFF_HOURS).toBe(24);
    expect(PAYOUT_DELAY_HOURS).toBe(48);
    expect(TAKEOVER_WINDOW_HOURS).toBe(12);
  });
});

describe("P1/P2 — rider cancellation cutoff", () => {
  it("P1: exactly 24h before departure is still free", () => {
    expect(isFreeCancellation(departureIn(24), now)).toBe(true);
  });
  it("P1: 25h before departure is free", () => {
    expect(isFreeCancellation(departureIn(25), now)).toBe(true);
  });
  it("P2: 23h59m before departure is retained", () => {
    expect(isFreeCancellation(departureIn(23.98), now)).toBe(false);
  });
  it("P3: after departure is never free (no-show territory)", () => {
    expect(isFreeCancellation(departureIn(-1), now)).toBe(false);
  });
});

describe("P8 — payout timing", () => {
  it("payout is due exactly 48h after departure", () => {
    const departure = departureIn(10);
    expect(payoutDueAt(departure).getTime()).toBe(new Date(departure).getTime() + 48 * H);
  });
});

describe("P4 — takeover window", () => {
  it("is 12h when departure is far away", () => {
    const deadline = takeoverDeadline(departureIn(100), now);
    expect(deadline.getTime()).toBe(now.getTime() + 12 * H);
  });

  it("never extends past the free-cancellation cutoff (riders keep their P1 exit)", () => {
    // Departure in 30h → cutoff is in 6h → window is capped at 6h, not 12h
    const deadline = takeoverDeadline(departureIn(30), now);
    expect(deadline.getTime()).toBe(now.getTime() + 6 * H);
  });
});

describe("hoursToDeparture", () => {
  it("is negative after departure", () => {
    expect(hoursToDeparture(departureIn(-2), now)).toBe(-2);
  });
});
