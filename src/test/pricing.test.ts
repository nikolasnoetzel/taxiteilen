// Money math — one test per rule in docs/policies.md §Preis & Gebühren.
import { describe, expect, it } from "vitest";
import {
  PLATFORM_FEE_PERCENT,
  riderCharge,
  seatPriceCents,
  formatEuro,
} from "../../supabase/functions/_shared/pricing";

describe("seatPriceCents", () => {
  it("splits the fixed route price by total seats (€120 / 4 = €30)", () => {
    expect(seatPriceCents(12000, 4)).toBe(3000);
  });

  it("rounds to the nearest cent (initiator absorbs the remainder)", () => {
    expect(seatPriceCents(10000, 3)).toBe(3333); // 3 × 33,33 = 99,99 → 1 ct bleibt beim Initiator
    expect(seatPriceCents(11000, 3)).toBe(3667); // rounds up
  });

  it("rejects rides with fewer than 2 seats", () => {
    expect(() => seatPriceCents(12000, 1)).toThrow();
  });
});

describe("riderCharge", () => {
  it("fee is exactly 15%", () => {
    expect(PLATFORM_FEE_PERCENT).toBe(15);
  });

  it("rider pays share + 15%; initiator receives the full share (€30 → €34,50)", () => {
    const c = riderCharge(3000, 1);
    expect(c.share_cents).toBe(3000);
    expect(c.fee_cents).toBe(450);
    expect(c.amount_cents).toBe(3450);
  });

  it("scales with persons: 2 persons on a €30 seat pay €69", () => {
    const c = riderCharge(3000, 2);
    expect(c.share_cents).toBe(6000);
    expect(c.fee_cents).toBe(900);
    expect(c.amount_cents).toBe(6900);
  });

  it("plan example: €120 ride, 4 seats, 3 riders → platform earns €13,50 gross", () => {
    const seat = seatPriceCents(12000, 4);
    const riders = [riderCharge(seat, 1), riderCharge(seat, 1), riderCharge(seat, 1)];
    const totalPaid = riders.reduce((s, r) => s + r.amount_cents, 0);
    const totalToInitiator = riders.reduce((s, r) => s + r.share_cents, 0);
    expect(totalPaid).toBe(10350); // 3 × €34,50
    expect(totalToInitiator).toBe(9000); // 3 × €30
    expect(totalPaid - totalToInitiator).toBe(1350); // €13,50 platform
  });

  it("rounds the fee on odd shares", () => {
    // seat 33,33 € → fee 4,9995 → 5,00 €
    expect(riderCharge(3333, 1).fee_cents).toBe(500);
  });

  it("rejects zero persons", () => {
    expect(() => riderCharge(3000, 0)).toThrow();
  });
});

describe("formatEuro", () => {
  it("formats German currency", () => {
    // Intl nutzt schmale geschützte Leerzeichen — für den Vergleich normalisieren
    expect(formatEuro(3600).replace(/[\s\u202F\u00A0]/g, " ")).toBe("36,00 €");
  });
});
