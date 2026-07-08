// Money state transitions shared by cancel/dissolve/payout flows.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import type { Stripe } from "./stripe.ts";
import { enqueueEmail, templates } from "./emails.ts";
import { loadGroup, loadProfiles } from "./rides.ts";

export interface PaymentRow {
  id: string;
  membership_id: string;
  ride_group_id: string;
  user_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  share_cents: number;
  fee_cents: number;
  amount_cents: number;
  status: string;
}

/** Full refund of a paid/retained payment (P1, P4, P5, P7, dispute resolution). */
export async function refundPayment(
  admin: SupabaseClient,
  stripe: Stripe,
  payment: PaymentRow
): Promise<void> {
  if (!["paid", "retained"].includes(payment.status)) return; // nothing to refund
  if (!payment.stripe_payment_intent_id) return;
  const refund = await stripe.refunds.create(
    { payment_intent: payment.stripe_payment_intent_id },
    { idempotencyKey: `refund-${payment.id}` }
  );
  await admin
    .from("payments")
    .update({ status: "refunded", stripe_refund_id: refund.id, refunded_at: new Date().toISOString() })
    .eq("id", payment.id);
}

/** Expire a still-open Checkout session so an in-flight payment can't complete. */
export async function expireCheckout(stripe: Stripe, payment: PaymentRow): Promise<void> {
  if (payment.status !== "requires_payment" || !payment.stripe_checkout_session_id) return;
  try {
    await stripe.checkout.sessions.expire(payment.stripe_checkout_session_id);
  } catch (_err) {
    // already completed or expired — the webhook backstop handles the rest
  }
}

/**
 * Transfer the initiator's share for one payment (separate charges & transfers).
 * source_transaction ties the transfer to the charge's settlement, so we never
 * move money the platform hasn't actually received yet.
 */
export async function transferShare(
  admin: SupabaseClient,
  stripe: Stripe,
  payment: PaymentRow,
  destinationAccount: string
): Promise<void> {
  // Stripe replays cached 4xx errors per idempotency key. A first attempt uses
  // a stable key; retries after transfer_failed get an hourly suffix so a
  // transient failure (e.g. balance_insufficient) isn't replayed forever.
  const idempotencyKey =
    payment.status === "transfer_failed"
      ? `transfer-${payment.id}-r${Math.floor(Date.now() / 3_600_000)}`
      : `transfer-${payment.id}`;
  const transfer = await stripe.transfers.create(
    {
      amount: payment.share_cents,
      currency: "eur",
      destination: destinationAccount,
      transfer_group: payment.ride_group_id,
      ...(payment.stripe_charge_id ? { source_transaction: payment.stripe_charge_id } : {}),
      metadata: { payment_id: payment.id, ride_group_id: payment.ride_group_id },
    },
    { idempotencyKey }
  );
  await admin.from("transfers").upsert(
    {
      payment_id: payment.id,
      ride_group_id: payment.ride_group_id,
      stripe_transfer_id: transfer.id,
      destination_account: destinationAccount,
      amount_cents: payment.share_cents,
      status: "paid",
    },
    { onConflict: "payment_id" }
  );
  await admin.from("payments").update({ status: "transferred" }).eq("id", payment.id);
}

/** All refundable payments of a group (used when dissolving a ride). */
export async function refundAllGroupPayments(
  admin: SupabaseClient,
  stripe: Stripe,
  groupId: string
): Promise<PaymentRow[]> {
  const { data: payments } = await admin
    .from("payments")
    .select("*")
    .eq("ride_group_id", groupId)
    .in("status", ["paid", "retained", "requires_payment"]);
  const refunded: PaymentRow[] = [];
  for (const payment of (payments ?? []) as PaymentRow[]) {
    if (payment.status === "requires_payment") {
      await expireCheckout(stripe, payment);
      continue;
    }
    await refundPayment(admin, stripe, payment);
    refunded.push(payment);
  }
  return refunded;
}

/**
 * Dissolve a ride: refund every paid AND retained payment (money kept back
 * from late cancellers is not owed to an initiator who cancels the ride),
 * expire in-flight checkouts, cancel the group and all live memberships,
 * and notify everyone. Used by cancel-ride (P5/P6), takeover expiry (P4)
 * and resolve-dispute (P7).
 */
export async function dissolveGroup(
  admin: SupabaseClient,
  stripe: Stripe,
  groupId: string,
  cancelReason: string
): Promise<PaymentRow[]> {
  const { emailCtx } = await loadGroup(admin, groupId);
  const refunded = await refundAllGroupPayments(admin, stripe, groupId);

  const { data: liveMembers } = await admin
    .from("memberships")
    .select("user_id")
    .eq("ride_group_id", groupId)
    .in("status", ["active", "pending_payment"]);

  await admin.from("ride_groups")
    .update({ status: "cancelled", cancel_reason: cancelReason })
    .eq("id", groupId);
  await admin.from("memberships")
    .update({ status: "cancelled_free", cancelled_at: new Date().toISOString() })
    .eq("ride_group_id", groupId)
    .in("status", ["active", "pending_payment"]);

  // Notify live members plus anyone who just got a retained payment back
  const recipients = new Set<string>([
    ...(liveMembers ?? []).map((m) => m.user_id),
    ...refunded.map((p) => p.user_id),
  ]);
  const profiles = await loadProfiles(admin, [...recipients]);
  for (const userId of recipients) {
    const email = profiles.get(userId)?.email;
    const amount = refunded.find((p) => p.user_id === userId)?.amount_cents ?? null;
    if (email) await enqueueEmail(admin, email, templates.ride_dissolved(emailCtx, amount), "ride_dissolved");
  }
  return refunded;
}
