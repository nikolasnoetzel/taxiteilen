// P4: an active rider takes over a ride whose initiator cancelled.
// Their own payment is refunded (they now pay the driver in the cab);
// remaining payments will be paid out to THEM after the ride.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { CANCEL_CUTOFF_HOURS, hoursToDeparture } from "../_shared/policy.ts";
import { refundPayment, PaymentRow } from "../_shared/money.ts";
import { loadGroup, loadProfile } from "../_shared/rides.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const { ride_group_id } = await req.json();
  if (!ride_group_id) throw new ApiError("missing_fields");

  const { group } = await loadGroup(admin, ride_group_id);
  if (group.status !== "initiator_needed") throw new ApiError("no_takeover_open", 409);
  if (group.takeover_deadline && new Date(group.takeover_deadline) < new Date()) {
    throw new ApiError("takeover_expired", 409);
  }

  const profile = await loadProfile(admin, user.id);
  if (profile.blocked_at) throw new ApiError("account_blocked", 403);
  if (!profile.stripe_connect_account_id || !profile.stripe_connect_onboarding_complete) {
    throw new ApiError("connect_onboarding_required", 403,
      "Um die Fahrt zu übernehmen, richte zuerst den Zahlungsempfang ein.");
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("*")
    .eq("ride_group_id", ride_group_id)
    .eq("user_id", user.id)
    .eq("role", "rider")
    .eq("status", "active")
    .maybeSingle();
  if (!membership) throw new ApiError("not_a_member", 403);

  // Atomically claim the group FIRST — the status guard makes sure exactly
  // one concurrent taker wins; the loser must not get a refund or the role.
  const backToLocked = hoursToDeparture(group.departure_at) < CANCEL_CUTOFF_HOURS;
  const { data: claimed } = await admin.from("ride_groups")
    .update({
      initiator_id: user.id,
      status: backToLocked ? "locked" : "open",
      takeover_deadline: null,
      ...(backToLocked ? { locked_at: new Date().toISOString() } : {}),
    })
    .eq("id", ride_group_id)
    .eq("status", "initiator_needed")
    .select("id")
    .maybeSingle();
  if (!claimed) throw new ApiError("no_takeover_open", 409);

  await admin.from("memberships").update({ role: "initiator" }).eq("id", membership.id);

  // Refund the new initiator's own payment — initiators don't pay a share.
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("membership_id", membership.id)
    .maybeSingle();
  if (payment && ["paid", "retained"].includes(payment.status)) {
    await refundPayment(admin, stripeClient(), payment as PaymentRow);
  }

  return json({ status: backToLocked ? "locked" : "open", initiator_id: user.id });
}));
