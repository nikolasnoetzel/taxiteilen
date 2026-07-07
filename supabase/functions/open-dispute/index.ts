// P8: a group member reports a problem ("ride didn't happen", wrong no-show).
// An open dispute pauses the whole group's payout until an admin resolves it.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { loadGroup, loadProfiles } from "../_shared/rides.ts";
import { enqueueEmail, templates } from "../_shared/emails.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const { ride_group_id, reason } = await req.json();
  if (!ride_group_id || !reason?.trim()) throw new ApiError("missing_fields");

  const { group, emailCtx } = await loadGroup(admin, ride_group_id);

  const { data: membership } = await admin
    .from("memberships")
    .select("id")
    .eq("ride_group_id", ride_group_id)
    .eq("user_id", user.id)
    .in("status", ["active", "no_show", "cancelled_late"])
    .maybeSingle();
  if (!membership && group.initiator_id !== user.id) throw new ApiError("not_a_member", 403);

  // Disputes only make sense before the payout has run
  if (group.status === "completed") throw new ApiError("payout_already_done", 409);

  const { data: existing } = await admin
    .from("disputes")
    .select("id")
    .eq("ride_group_id", ride_group_id)
    .eq("raised_by", user.id)
    .eq("status", "open")
    .maybeSingle();
  if (existing) throw new ApiError("dispute_already_open", 409);

  const { data: dispute, error } = await admin
    .from("disputes")
    .insert({ ride_group_id, raised_by: user.id, reason: reason.slice(0, 2000) })
    .select("id")
    .single();
  if (error || !dispute) throw new ApiError("create_failed", 500, error?.message);

  // Notify initiator + the reporter
  const profiles = await loadProfiles(admin, [group.initiator_id, user.id]);
  for (const uid of [group.initiator_id, user.id]) {
    const email = profiles.get(uid)?.email;
    if (email) await enqueueEmail(admin, email, templates.dispute_opened(emailCtx), "dispute_opened");
  }

  return json({ dispute_id: dispute.id, status: "open" });
}));
