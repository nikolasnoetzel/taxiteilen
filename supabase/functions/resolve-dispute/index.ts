// Admin-only (profiles.is_admin): resolves a dispute.
// resolved_refund → refund the reporter's payment (and un-retain their no-show)
// resolved_payout → nothing else; cron-payout resumes automatically.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { refundPayment, PaymentRow } from "../_shared/money.ts";
import { loadProfile } from "../_shared/rides.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const caller = await loadProfile(admin, user.id);
  if (!caller.is_admin) throw new ApiError("forbidden", 403);

  const { dispute_id, resolution, note } = await req.json();
  if (!dispute_id || !["resolved_refund", "resolved_payout"].includes(resolution)) {
    throw new ApiError("missing_fields");
  }

  const { data: dispute } = await admin
    .from("disputes")
    .select("*")
    .eq("id", dispute_id)
    .eq("status", "open")
    .maybeSingle();
  if (!dispute) throw new ApiError("dispute_not_found", 404);

  if (resolution === "resolved_refund") {
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("ride_group_id", dispute.ride_group_id)
      .eq("user_id", dispute.raised_by)
      .in("status", ["paid", "retained"])
      .maybeSingle();
    if (payment) await refundPayment(admin, stripeClient(), payment as PaymentRow);
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

  return json({ status: resolution });
}));
