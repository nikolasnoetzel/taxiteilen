// The initiator cancels the whole ride.
// P4 (≥24h): riders get a takeover window; if it lapses, cron-lock-rides dissolves.
// P5 (<24h): immediate dissolve, full refunds, initiator gets a strike.
// P6: no paid riders → simple cancel, no money involved, no strike.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { isFreeCancellation, takeoverDeadline } from "../_shared/policy.ts";
import { refundAllGroupPayments } from "../_shared/money.ts";
import { loadGroup, loadProfiles } from "../_shared/rides.ts";
import { enqueueEmail, templates, departureLabel } from "../_shared/emails.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const { ride_group_id } = await req.json();
  if (!ride_group_id) throw new ApiError("missing_fields");

  const { group, emailCtx } = await loadGroup(admin, ride_group_id);
  if (group.initiator_id !== user.id) throw new ApiError("not_initiator", 403);
  if (!["open", "locked"].includes(group.status)) throw new ApiError("group_not_cancellable", 409);

  const { data: riders } = await admin
    .from("memberships")
    .select("*, payments(*)")
    .eq("ride_group_id", ride_group_id)
    .eq("role", "rider")
    .eq("status", "active");
  const activeRiders = riders ?? [];
  const paidRiders = activeRiders.filter((m) => m.payments?.status === "paid");

  // P6 — nobody paid yet: cancel outright, nothing owed anywhere.
  if (paidRiders.length === 0) {
    await admin.from("ride_groups")
      .update({ status: "cancelled", cancel_reason: "initiator_cancelled_unfilled" })
      .eq("id", ride_group_id);
    await admin.from("memberships")
      .update({ status: "cancelled_free", cancelled_at: new Date().toISOString() })
      .eq("ride_group_id", ride_group_id)
      .in("status", ["pending_payment", "active"]);
    return json({ status: "cancelled", refunds: 0, strike: false });
  }

  const profiles = await loadProfiles(admin, activeRiders.map((m) => m.user_id));

  if (isFreeCancellation(group.departure_at)) {
    // P4 — open a takeover window instead of dissolving immediately.
    const deadline = takeoverDeadline(group.departure_at);
    if (deadline.getTime() > Date.now() + 10 * 60_000) {
      await admin.from("ride_groups")
        .update({ status: "initiator_needed", takeover_deadline: deadline.toISOString() })
        .eq("id", ride_group_id);
      await admin.from("memberships")
        .update({ status: "cancelled_free", cancelled_at: new Date().toISOString() })
        .eq("ride_group_id", ride_group_id)
        .eq("user_id", user.id);
      const deadlineLabel = departureLabel(deadline.toISOString());
      for (const rider of activeRiders) {
        const email = profiles.get(rider.user_id)?.email;
        if (email) await enqueueEmail(admin, email, templates.takeover_offer(emailCtx, deadlineLabel), "takeover_offer");
      }
      return json({ status: "initiator_needed", takeover_deadline: deadline.toISOString(), strike: false });
    }
    // Window would be uselessly short → fall through to dissolve (still no strike, it's ≥24h).
  }

  // P5 (or P4 with no usable window) — dissolve: refund everyone.
  const refunded = await refundAllGroupPayments(admin, stripeClient(), ride_group_id);
  await admin.from("ride_groups")
    .update({ status: "cancelled", cancel_reason: "initiator_cancelled" })
    .eq("id", ride_group_id);
  await admin.from("memberships")
    .update({ status: "cancelled_free", cancelled_at: new Date().toISOString() })
    .eq("ride_group_id", ride_group_id)
    .in("status", ["pending_payment", "active"]);

  const late = !isFreeCancellation(group.departure_at);
  if (late) {
    await admin.from("strikes").insert({
      user_id: user.id,
      ride_group_id,
      reason: "late_cancel_initiator",
    });
  }

  for (const rider of activeRiders) {
    const email = profiles.get(rider.user_id)?.email;
    const amount = refunded.find((p) => p.user_id === rider.user_id)?.amount_cents ?? null;
    if (email) await enqueueEmail(admin, email, templates.ride_dissolved(emailCtx, amount), "ride_dissolved");
  }

  return json({ status: "cancelled", refunds: refunded.length, strike: late });
}));
