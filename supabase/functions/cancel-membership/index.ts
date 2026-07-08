// A co-rider cancels their seat. P1 (≥24h: full refund) / P2 (<24h: retained).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { isFreeCancellation } from "../_shared/policy.ts";
import { expireCheckout, refundPayment, PaymentRow } from "../_shared/money.ts";
import { loadGroup, loadProfile, firstName } from "../_shared/rides.ts";
import { enqueueEmail, templates } from "../_shared/emails.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const { ride_group_id } = await req.json();
  if (!ride_group_id) throw new ApiError("missing_fields");

  const { data: membership } = await admin
    .from("memberships")
    .select("*")
    .eq("ride_group_id", ride_group_id)
    .eq("user_id", user.id)
    .in("status", ["pending_payment", "active"])
    .maybeSingle();
  if (!membership) throw new ApiError("not_a_member", 404);
  if (membership.role === "initiator") {
    throw new ApiError("use_cancel_ride", 400, "Initiatoren sagen die ganze Fahrt über 'Fahrt absagen' ab.");
  }

  const { group, emailCtx } = await loadGroup(admin, ride_group_id);
  if (!["open", "locked", "initiator_needed"].includes(group.status)) {
    throw new ApiError("group_not_cancellable", 409);
  }

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("membership_id", membership.id)
    .maybeSingle();

  const free = isFreeCancellation(group.departure_at);
  const newStatus = free ? "cancelled_free" : "cancelled_late";

  if (payment && payment.status === "paid") {
    if (free) {
      await refundPayment(admin, stripeClient(), payment as PaymentRow);
    } else {
      await admin.from("payments").update({ status: "retained" }).eq("id", payment.id);
    }
  } else if (payment && payment.status === "requires_payment") {
    // Kill the in-flight checkout so it can't complete after the cancel
    await expireCheckout(stripeClient(), payment as PaymentRow);
  }

  await admin
    .from("memberships")
    .update({ status: newStatus, cancelled_at: new Date().toISOString() })
    .eq("id", membership.id);

  // Notify the rider and the initiator
  const riderProfile = await loadProfile(admin, user.id);
  if (riderProfile.email && payment?.amount_cents) {
    await enqueueEmail(
      admin,
      riderProfile.email,
      free ? templates.cancelled_free(emailCtx, payment.amount_cents) : templates.cancelled_late(emailCtx, payment.amount_cents),
      free ? "cancelled_free" : "cancelled_late"
    );
  }
  const initiatorProfile = await loadProfile(admin, group.initiator_id);
  if (initiatorProfile.email) {
    await enqueueEmail(admin, initiatorProfile.email, templates.seat_freed(emailCtx, firstName(riderProfile)), "seat_freed");
  }

  return json({ status: newStatus, refunded: free && payment?.status === "paid" });
}));
