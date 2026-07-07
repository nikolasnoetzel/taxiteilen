// Lifecycle cron (every 10 min, pg_cron → invoke_edge_function):
// 1. Dissolve initiator_needed groups whose takeover window lapsed (P4).
// 2. Lock open groups at T-24h that have paid riders; notify everyone once.
// 3. Send the P6 "no riders yet" choice email at T-24h.
// 4. Auto-cancel unfilled groups once departure passed (P6).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, handler, json, requireCronSecret } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { CANCEL_CUTOFF_HOURS } from "../_shared/policy.ts";
import { refundAllGroupPayments } from "../_shared/money.ts";
import { loadGroup, loadProfiles } from "../_shared/rides.ts";
import { enqueueEmail, templates } from "../_shared/emails.ts";

async function markEventOnce(admin: ReturnType<typeof adminClient>, groupId: string, event: string): Promise<boolean> {
  const { error } = await admin.from("ride_group_events").insert({ ride_group_id: groupId, event });
  return !error; // duplicate key → already handled
}

serve(handler(async (req) => {
  const admin = adminClient();
  await requireCronSecret(req, admin);
  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() + CANCEL_CUTOFF_HOURS * 3_600_000).toISOString();
  const results = { dissolved: 0, locked: 0, unfilled_notified: 0, auto_cancelled: 0 };

  // 1. Takeover windows that lapsed → dissolve with full refunds
  const { data: lapsed } = await admin
    .from("ride_groups")
    .select("id")
    .eq("status", "initiator_needed")
    .lt("takeover_deadline", nowIso);
  for (const g of lapsed ?? []) {
    const { emailCtx } = await loadGroup(admin, g.id);
    const refunded = await refundAllGroupPayments(admin, stripeClient(), g.id);
    await admin.from("ride_groups")
      .update({ status: "cancelled", cancel_reason: "takeover_expired" })
      .eq("id", g.id);
    const { data: members } = await admin
      .from("memberships")
      .select("user_id")
      .eq("ride_group_id", g.id)
      .in("status", ["active", "pending_payment"]);
    await admin.from("memberships")
      .update({ status: "cancelled_free", cancelled_at: nowIso })
      .eq("ride_group_id", g.id)
      .in("status", ["active", "pending_payment"]);
    const profiles = await loadProfiles(admin, (members ?? []).map((m) => m.user_id));
    for (const m of members ?? []) {
      const email = profiles.get(m.user_id)?.email;
      const amount = refunded.find((p) => p.user_id === m.user_id)?.amount_cents ?? null;
      if (email) await enqueueEmail(admin, email, templates.ride_dissolved(emailCtx, amount), "ride_dissolved");
    }
    results.dissolved++;
  }

  // 2+3. Groups reaching T-24h
  const { data: reaching } = await admin
    .from("ride_groups")
    .select("id, initiator_id, seat_price_cents")
    .eq("status", "open")
    .lte("departure_at", cutoffIso)
    .gt("departure_at", nowIso);

  for (const g of reaching ?? []) {
    const { data: activeRiders } = await admin
      .from("memberships")
      .select("user_id, num_persons, payments(status, share_cents)")
      .eq("ride_group_id", g.id)
      .eq("role", "rider")
      .eq("status", "active");
    const paid = (activeRiders ?? []).filter((m) =>
      ["paid", "retained"].includes((m.payments as { status?: string })?.status ?? "")
    );

    if (paid.length > 0) {
      await admin.from("ride_groups")
        .update({ status: "locked", locked_at: nowIso })
        .eq("id", g.id);
      if (await markEventOnce(admin, g.id, "locked_notified")) {
        const { group, emailCtx } = await loadGroup(admin, g.id);
        const profiles = await loadProfiles(admin, [g.initiator_id, ...paid.map((m) => m.user_id)]);
        for (const m of paid) {
          const email = profiles.get(m.user_id)?.email;
          if (email) await enqueueEmail(admin, email, templates.ride_locked_rider(emailCtx, group.meeting_point), "ride_locked_rider");
        }
        const initiatorEmail = profiles.get(g.initiator_id)?.email;
        if (initiatorEmail) {
          const expectedPayout = paid.reduce(
            (sum, m) => sum + ((m.payments as { share_cents?: number })?.share_cents ?? 0), 0);
          await enqueueEmail(admin, initiatorEmail,
            templates.ride_locked_initiator(emailCtx, paid.length, expectedPayout), "ride_locked_initiator");
        }
      }
      results.locked++;
    } else if (await markEventOnce(admin, g.id, "unfilled_notified")) {
      const { emailCtx } = await loadGroup(admin, g.id);
      const profiles = await loadProfiles(admin, [g.initiator_id]);
      const email = profiles.get(g.initiator_id)?.email;
      if (email) await enqueueEmail(admin, email, templates.unfilled_choice(emailCtx), "unfilled_choice");
      results.unfilled_notified++;
    }
  }

  // 4. Departure passed without any paid rider → auto-cancel (no money exists)
  const { data: departed } = await admin
    .from("ride_groups")
    .select("id")
    .eq("status", "open")
    .lt("departure_at", nowIso);
  for (const g of departed ?? []) {
    const { count } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("ride_group_id", g.id)
      .in("status", ["paid", "retained"]);
    if (!count) {
      await admin.from("ride_groups")
        .update({ status: "cancelled", cancel_reason: "unfilled_auto" })
        .eq("id", g.id);
      results.auto_cancelled++;
    } else {
      // Paid riders but never locked (edge case): lock now so payout picks it up
      await admin.from("ride_groups").update({ status: "locked", locked_at: nowIso }).eq("id", g.id);
      results.locked++;
    }
  }

  return json(results);
}));
