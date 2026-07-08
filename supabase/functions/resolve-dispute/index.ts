// Admin-only (profiles.is_admin): resolves a dispute.
// resolved_refund   → refund every refundable payment of the reporter
// resolved_payout   → nothing else; cron-payout resumes automatically
// resolved_dissolve → P7 / initiator no-show: refund EVERYONE, cancel the
//                     group, optionally strike the initiator (strike_initiator: true)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { dissolveGroup, refundPayment, PaymentRow } from "../_shared/money.ts";
import { loadProfile } from "../_shared/rides.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const caller = await loadProfile(admin, user.id);
  if (!caller.is_admin) throw new ApiError("forbidden", 403);

  const { dispute_id, resolution, note, strike_initiator } = await req.json();
  if (!dispute_id || !["resolved_refund", "resolved_payout", "resolved_dissolve"].includes(resolution)) {
    throw new ApiError("missing_fields");
  }

  const { data: dispute } = await admin
    .from("disputes")
    .select("*")
    .eq("id", dispute_id)
    .eq("status", "open")
    .maybeSingle();
  if (!dispute) throw new ApiError("dispute_not_found", 404);

  let refunds = 0;

  if (resolution === "resolved_refund") {
    // All refundable payments of the reporter (rejoin can create several rows)
    const { data: payments } = await admin
      .from("payments")
      .select("*")
      .eq("ride_group_id", dispute.ride_group_id)
      .eq("user_id", dispute.raised_by)
      .in("status", ["paid", "retained"]);
    for (const payment of (payments ?? []) as PaymentRow[]) {
      await refundPayment(admin, stripeClient(), payment);
      refunds++;
    }
  }

  if (resolution === "resolved_dissolve") {
    const refunded = await dissolveGroup(admin, stripeClient(), dispute.ride_group_id, "platform_dissolved");
    refunds = refunded.length;
    if (strike_initiator) {
      const { data: group } = await admin
        .from("ride_groups")
        .select("initiator_id")
        .eq("id", dispute.ride_group_id)
        .single();
      if (group) {
        await admin.from("strikes").insert({
          user_id: group.initiator_id,
          ride_group_id: dispute.ride_group_id,
          reason: "no_show_initiator",
        });
      }
    }
  }

  await admin
    .from("disputes")
    .update({
      status: resolution,
      resolution_note: note?.slice(0, 2000) ?? null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", dispute_id);

  return json({ status: resolution, refunds });
}));
