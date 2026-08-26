// End-to-End-Simulation der Geld-Lebenszyklen (P1–P8) gegen den ECHTEN
// Orchestrierungscode aus supabase/functions/_shared/money.ts — Stripe und
// Postgres sind durch Fakes ersetzt (src/test/fakes.ts), die Regeln nicht.
//
// Nicht abgedeckt (braucht deployte Functions + echtes Stripe, siehe
// docs/stripe-setup.md Testprotokoll): Webhook-Signaturprüfung, Checkout-UI,
// RLS. Die Invarianten hier sind die aus docs/policies.md.
import { beforeEach, describe, expect, it } from "vitest";
import {
  dissolveGroup,
  refundAllGroupPayments,
  refundPayment,
  transferShare,
  type PaymentRow,
} from "../../supabase/functions/_shared/money";
import { riderCharge, seatPriceCents } from "../../supabase/functions/_shared/pricing";
import { FakeDb, FakeStripe, seedGroup, seedRider } from "./fakes";

// Die Fakes erfüllen die benutzte Teilmenge der echten Client-Interfaces.
type Admin = Parameters<typeof refundPayment>[0];
type StripeLike = Parameters<typeof refundPayment>[1];

let db: FakeDb;
let stripe: FakeStripe;
const admin = () => db as unknown as Admin;
const s = () => stripe as unknown as StripeLike;

const payment = (payId: string): PaymentRow =>
  db.tables["payments"].find((p) => p.id === payId) as unknown as PaymentRow;

beforeEach(() => {
  db = new FakeDb();
  stripe = new FakeStripe();
});

describe("P1 — Mitfahrer storniert ≥24h: voller Refund (Anteil + Gebühr)", () => {
  it("erstattet den kompletten Betrag und markiert das Payment", async () => {
    const { groupId } = seedGroup(db, { seatPriceCents: 3000 });
    const c = riderCharge(3000, 1);
    const { payId, pi } = seedRider(db, stripe, groupId, { status: "paid", shareCents: c.share_cents, feeCents: c.fee_cents });

    await refundPayment(admin(), s(), payment(payId));

    expect(stripe.of("refunds.create")).toHaveLength(1);
    expect(stripe.of("refunds.create")[0].params.payment_intent).toBe(pi);
    expect(stripe.refundedCents).toBe(c.amount_cents); // 3450 — auch die Gebühr geht zurück
    expect(payment(payId).status).toBe("refunded");
  });

  it("ist idempotent: ein zweiter Aufruf erstattet nicht doppelt", async () => {
    const { groupId } = seedGroup(db, { seatPriceCents: 3000 });
    const c = riderCharge(3000, 1);
    const { payId } = seedRider(db, stripe, groupId, { status: "paid", shareCents: c.share_cents, feeCents: c.fee_cents });

    await refundPayment(admin(), s(), payment(payId));
    await refundPayment(admin(), s(), payment(payId)); // Status ist jetzt "refunded"

    expect(stripe.of("refunds.create")).toHaveLength(1);
  });

  it("fasst Payments ohne PaymentIntent nie an", async () => {
    const { groupId } = seedGroup(db, { seatPriceCents: 3000 });
    const { payId } = seedRider(db, stripe, groupId, { status: "requires_payment", shareCents: 3000, feeCents: 450 });

    await refundPayment(admin(), s(), payment(payId));
    expect(stripe.of("refunds.create")).toHaveLength(0);
  });
});

describe("Auszahlung — nur der Anteil wandert zum Initiator, die Gebühr bleibt", () => {
  it("transferiert share_cents mit source_transaction und schreibt transfers+payments", async () => {
    const { groupId } = seedGroup(db, { seatPriceCents: 3750 });
    const c = riderCharge(3750, 1); // Kiel↔HAM: 37,50 € + 15 % = 43,13 €
    const { payId } = seedRider(db, stripe, groupId, { status: "paid", shareCents: c.share_cents, feeCents: c.fee_cents });

    await transferShare(admin(), s(), payment(payId), "acct_ina");

    const call = stripe.of("transfers.create")[0];
    expect(call.params.amount).toBe(3750); // NICHT 4313 — Gebühr bleibt bei der Plattform
    expect(call.params.destination).toBe("acct_ina");
    expect(call.params.source_transaction).toBeTruthy();
    expect(call.params.transfer_group).toBe(groupId);
    expect(payment(payId).status).toBe("transferred");
    expect(db.tables["transfers"]).toHaveLength(1);
    expect(db.tables["transfers"][0]).toMatchObject({ payment_id: payId, amount_cents: 3750, status: "paid" });
  });

  it("P2/P3 — auch retained-Anteile gehen an den Initiator", async () => {
    const { groupId } = seedGroup(db, { seatPriceCents: 3000 });
    const { payId } = seedRider(db, stripe, groupId, { status: "retained", shareCents: 3000, feeCents: 450 });

    await transferShare(admin(), s(), payment(payId), "acct_ina");
    expect(stripe.transferredCents).toBe(3000);
  });

  it("Retry nach transfer_failed nutzt einen frischen Idempotency-Key", async () => {
    const { groupId } = seedGroup(db, { seatPriceCents: 3000 });
    const { payId } = seedRider(db, stripe, groupId, { status: "paid", shareCents: 3000, feeCents: 450 });

    stripe.failNextTransfer = true;
    await expect(transferShare(admin(), s(), payment(payId), "acct_ina")).rejects.toThrow("balance_insufficient");
    const firstKey = stripe.of("transfers.create")[0].idempotencyKey!;

    // cron-payout markiert das Payment als transfer_failed und versucht es später erneut
    db.tables["payments"].find((p) => p.id === payId)!.status = "transfer_failed";
    await transferShare(admin(), s(), payment(payId), "acct_ina");
    const secondKey = stripe.of("transfers.create")[1].idempotencyKey!;

    expect(firstKey).toBe(`transfer-${payId}`);
    expect(secondKey).not.toBe(firstKey);
    expect(secondKey.startsWith(`transfer-${payId}-r`)).toBe(true);
    expect(payment(payId).status).toBe("transferred");
  });
});

describe("Auflösung (P4-Ablauf, P5, P6, P7) — dissolveGroup", () => {
  it("erstattet paid UND retained, beendet offene Checkouts, cancelt Gruppe + Memberships, mailt", async () => {
    const { groupId, initiatorId } = seedGroup(db, { seatPriceCents: 3000 });
    const c = riderCharge(3000, 1);
    const paid = seedRider(db, stripe, groupId, { status: "paid", shareCents: c.share_cents, feeCents: c.fee_cents, name: "Paula Paid" });
    const retained = seedRider(db, stripe, groupId, { status: "retained", shareCents: c.share_cents, feeCents: c.fee_cents, name: "Rolf Retained" });
    const open = seedRider(db, stripe, groupId, { status: "requires_payment", shareCents: c.share_cents, feeCents: c.fee_cents, name: "Olga Offen" });

    const refunded = await dissolveGroup(admin(), s(), groupId, "initiator_cancelled_late");

    // Geld: beide eingezogenen Zahlungen komplett zurück — Einbehaltenes steht
    // dem Initiator nur zu, wenn die Fahrt stattfindet (docs/policies.md).
    expect(refunded.map((p) => p.id).sort()).toEqual([paid.payId, retained.payId].sort());
    expect(stripe.refundedCents).toBe(2 * c.amount_cents);
    expect(stripe.transferredCents).toBe(0);
    // Offene Session wird aktiv beendet (Race-Schutz)
    expect(stripe.of("checkout.sessions.expire")).toHaveLength(1);
    // Zustand
    expect(db.tables["ride_groups"][0].status).toBe("cancelled");
    expect(db.tables["ride_groups"][0].cancel_reason).toBe("initiator_cancelled_late");
    const memStatuses = Object.fromEntries(db.tables["memberships"].map((m) => [m.user_id, m.status]));
    expect(memStatuses[initiatorId]).toBe("cancelled_free");
    expect(memStatuses[paid.userId]).toBe("cancelled_free");
    expect(memStatuses[open.userId]).toBe("cancelled_free");
    // retained-Membership (cancelled_late) bleibt historisch unverändert
    expect(memStatuses[retained.userId]).toBe("cancelled_late");
    // Mails: alle Live-Mitglieder + alle Erstatteten (ohne Doppel)
    const recipients = db.emails.map((e) => e.to).sort();
    expect(db.emails.every((e) => e.label === "ride_dissolved")).toBe(true);
    expect(new Set(recipients).size).toBe(recipients.length);
    expect(recipients).toContain("ina@example.com");
    expect(recipients).toContain(`${retained.userId}@example.com`);
  });

  it("Geld-Erhaltung: eingenommen = erstattet + transferiert + verbleibende Gebühren", async () => {
    const seat = seatPriceCents(15000, 4); // 3750
    const { groupId } = seedGroup(db, { seatPriceCents: seat });
    const c1 = riderCharge(seat, 1);
    const c2 = riderCharge(seat, 2);
    const r1 = seedRider(db, stripe, groupId, { status: "paid", shareCents: c1.share_cents, feeCents: c1.fee_cents });
    const r2 = seedRider(db, stripe, groupId, { status: "paid", shareCents: c2.share_cents, feeCents: c2.fee_cents });
    const r3 = seedRider(db, stripe, groupId, { status: "retained", shareCents: c1.share_cents, feeCents: c1.fee_cents });
    const totalIn = c1.amount_cents + c2.amount_cents + c1.amount_cents;

    // r1 storniert rechtzeitig (P1), Fahrt findet statt, r2+r3-Anteile werden ausgezahlt
    await refundPayment(admin(), s(), payment(r1.payId));
    await transferShare(admin(), s(), payment(r2.payId), "acct_ina");
    await transferShare(admin(), s(), payment(r3.payId), "acct_ina");

    const feesKept = c2.fee_cents + c1.fee_cents; // Gebühren der nicht erstatteten Zahlungen
    expect(stripe.refundedCents + stripe.transferredCents + feesKept).toBe(totalIn);
    // Und: die Plattform behält exakt 15 % der ausgezahlten Anteile als Gebühr
    expect(feesKept).toBe(Math.round(c2.share_cents * 0.15) + Math.round(c1.share_cents * 0.15));
  });

  it("refundAllGroupPayments lässt bereits transferierte Zahlungen unangetastet", async () => {
    const { groupId } = seedGroup(db, { seatPriceCents: 3000 });
    seedRider(db, stripe, groupId, { status: "transferred", shareCents: 3000, feeCents: 450 });
    const refunded = await refundAllGroupPayments(admin(), s(), groupId);
    expect(refunded).toHaveLength(0);
    expect(stripe.of("refunds.create")).toHaveLength(0);
  });
});
