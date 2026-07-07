// Money state transitions shared by cancel/dissolve/payout flows.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import type { Stripe } from "./stripe.ts";

export interface PaymentRow {
  id: string;
  membership_id: string;
  ride_group_id: string;
  user_id: string;
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
  const transfer = await stripe.transfers.create(
    {
      amount: payment.share_cents,
      currency: "eur",
      destination: destinationAccount,
      transfer_group: payment.ride_group_id,
      ...(payment.stripe_charge_id ? { source_transaction: payment.stripe_charge_id } : {}),
      metadata: { payment_id: payment.id, ride_group_id: payment.ride_group_id },
    },
    { idempotencyKey: `transfer-${payment.id}` }
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
    .in("status", ["paid", "retained"]);
  const refunded: PaymentRow[] = [];
  for (const payment of (payments ?? []) as PaymentRow[]) {
    await refundPayment(admin, stripe, payment);
    refunded.push(payment);
  }
  return refunded;
}
