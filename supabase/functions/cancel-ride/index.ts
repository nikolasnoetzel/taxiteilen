// The initiator cancels the whole ride.
// P4 (≥24h): riders get a takeover window; if it lapses, cron-lock-rides dissolves.
// P5 (<24h): immediate dissolve, full refunds, initiator gets a strike.
// P6: no money involved at all → simple cancel, no strike.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { isFreeCancellation, takeoverDeadline } from "../_shared/policy.ts";
import { dissolveGroup } from "../_shared/money.ts";
import { loadGroup, loadProfiles } from "../_shared/rides.ts";
import { enqueueEmail, templates, departureLabel } from "../_shared/emails.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();
  const stripe = stripeClient();

  const { ride_group_id } = await req.json();
  if (!ride_group_id) throw new ApiError("missing_fields");

  const { group, emailCtx } = await loadGroup(admin, ride_group_id);
  if (group.initiator_id !== user.id) throw new ApiError("not_initiator", 403);
  if (!["open", "locked"].includes(group.status)) throw new ApiError("group_not_cancellable", 409);

  // "Money exists" must consider retained payments of late cancellers /
  // no-shows too — an initiator who cancels does not get to keep them.
  const { data: moneyPayments } = await admin
    .from("payments")
    .select("id, status, user_id")
    .eq("ride_group_id", ride_group_id)
    .in("status", ["paid", "retained", "requires_payment"]);
  const hasMoney = (moneyPayments ?? []).some((p) => ["paid", "retained"].includes(p.status));

  const { data: activeRiders } = await admin
    .from("memberships")
    .select("id, user_id, payments(status)")
    .eq("ride_group_id", ride_group_id)
    .eq("role", "rider")
    .eq("status", "active");
  const activePaidRiders = (activeRiders ?? []).filter(
    (m) => (m.payments as { status?: string } | null)?.status === "paid"
  );

  // P6 — no money anywhere: cancel outright (in-flight checkouts get expired by dissolve too,
  // but without refunds there is nothing to dissolve — do it inline).
  if (!hasMoney) {
    await dissolveGroup(admin, stripe, ride_group_id, "initiator_cancelled_unfilled");
    return json({ status: "cancelled", refunds: 0, strike: false });
  }

  if (isFreeCancellation(group.departure_at) && activePaidRiders.length > 0) {
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
      const profiles = await loadProfiles(admin, activePaidRiders.map((m) => m.user_id));
      for (const rider of activePaidRiders) {
        const email = profiles.get(rider.user_id)?.email;
        if (email) await enqueueEmail(admin, email, templates.takeover_offer(emailCtx, deadlineLabel), "takeover_offer");
      }
      return json({ status: "initiator_needed", takeover_deadline: deadline.toISOString(), strike: false });
    }
    // Window would be uselessly short → fall through to dissolve (still no strike, it's ≥24h).
  }

  // P5 (or P4 with no usable window / only retained money) — dissolve: refund everyone.
  const refunded = await dissolveGroup(admin, stripe, ride_group_id, "initiator_cancelled");

  // Strike only when the initiator actually let committed riders down last-minute.
  const strike = !isFreeCancellation(group.departure_at) && activePaidRiders.length > 0;
  if (strike) {
    await admin.from("strikes").insert({
      user_id: user.id,
      ride_group_id,
      reason: "late_cancel_initiator",
    });
  }

  return json({ status: "cancelled", refunds: refunded.length, strike });
}));
