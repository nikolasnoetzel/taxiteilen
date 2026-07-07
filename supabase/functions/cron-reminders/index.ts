// Reminder cron (hourly): T-48h heads-up to all active members — last day of
// free cancellation starts at T-24h.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, handler, json, requireCronSecret } from "../_shared/http.ts";
import { CANCEL_CUTOFF_HOURS } from "../_shared/policy.ts";
import { loadGroup, loadProfiles } from "../_shared/rides.ts";
import { enqueueEmail, templates } from "../_shared/emails.ts";

const REMINDER_HOURS = 48;

serve(handler(async (req) => {
  const admin = adminClient();
  await requireCronSecret(req, admin);
  const results = { reminded: 0 };

  const from = new Date(Date.now() + CANCEL_CUTOFF_HOURS * 3_600_000).toISOString();
  const to = new Date(Date.now() + REMINDER_HOURS * 3_600_000).toISOString();

  const { data: upcoming } = await admin
    .from("ride_groups")
    .select("id, initiator_id")
    .eq("status", "open")
    .gt("departure_at", from)
    .lte("departure_at", to);

  for (const g of upcoming ?? []) {
    const { error: dup } = await admin
      .from("ride_group_events")
      .insert({ ride_group_id: g.id, event: "reminder_48h" });
    if (dup) continue; // already reminded

    const { emailCtx } = await loadGroup(admin, g.id);
    const { data: members } = await admin
      .from("memberships")
      .select("user_id")
      .eq("ride_group_id", g.id)
      .eq("status", "active");
    const profiles = await loadProfiles(admin, (members ?? []).map((m) => m.user_id));
    for (const m of members ?? []) {
      const email = profiles.get(m.user_id)?.email;
      if (email) await enqueueEmail(admin, email, templates.reminder(emailCtx), "reminder_48h");
    }
    results.reminded++;
  }

  return json(results);
}));
