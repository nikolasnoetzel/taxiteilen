// P3: the initiator marks a rider as no-show (departure passed, within the
// 48h dispute window). The rider's payment is retained; they can contest via
// open-dispute.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { loadGroup, loadProfile } from "../_shared/rides.ts";
import { enqueueEmail, templates } from "../_shared/emails.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const { ride_group_id, rider_user_id } = await req.json();
  if (!ride_group_id || !rider_user_id) throw new ApiError("missing_fields");

  const { group, emailCtx } = await loadGroup(admin, ride_group_id);
  if (group.initiator_id !== user.id) throw new ApiError("not_initiator", 403);

  const departure = new Date(group.departure_at).getTime();
  const now = Date.now();
  if (now < departure) throw new ApiError("ride_not_departed", 409);
  if (now > new Date(group.payout_due_at).getTime()) throw new ApiError("window_closed", 409);

  const { data: membership } = await admin
    .from("memberships")
    .select("*")
    .eq("ride_group_id", ride_group_id)
    .eq("user_id", rider_user_id)
    .eq("role", "rider")
    .eq("status", "active")
    .maybeSingle();
  if (!membership) throw new ApiError("not_a_member", 404);

  await admin.from("memberships").update({ status: "no_show" }).eq("id", membership.id);
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("membership_id", membership.id)
    .eq("status", "paid")
    .maybeSingle();
  if (payment) {
    await admin.from("payments").update({ status: "retained" }).eq("id", payment.id);
  }

  const riderProfile = await loadProfile(admin, rider_user_id);
  if (riderProfile.email && payment) {
    await enqueueEmail(admin, riderProfile.email, templates.no_show_marked(emailCtx, payment.amount_cents), "no_show_marked");
  }

  return json({ status: "no_show" });
}));
