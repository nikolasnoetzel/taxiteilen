// Payout cron (every 15 min): 48h after departure, transfer each rider's
// share to the initiator's Connect account — unless a dispute is open (P8).
// Transfers are idempotent (key = payment id) and retried on the next run
// if Stripe errors.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, handler, json, requireCronSecret } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { transferShare, PaymentRow } from "../_shared/money.ts";
import { loadGroup, loadProfiles } from "../_shared/rides.ts";
import { enqueueEmail, templates } from "../_shared/emails.ts";

serve(handler(async (req) => {
  const admin = adminClient();
  await requireCronSecret(req, admin);
  const stripe = stripeClient();
  const nowIso = new Date().toISOString();
  const results = { completed: 0, paused_by_dispute: 0, transfer_errors: 0 };

  const { data: due } = await admin
    .from("ride_groups")
    .select("id, initiator_id")
    .eq("status", "locked")
    .lte("payout_due_at", nowIso)
    .limit(50);

  for (const g of due ?? []) {
    const { count: openDisputes } = await admin
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("ride_group_id", g.id)
      .eq("status", "open");
    if (openDisputes) {
      results.paused_by_dispute++;
      continue;
    }

    const profiles = await loadProfiles(admin, [g.initiator_id]);
    const initiator = profiles.get(g.initiator_id);
    if (!initiator?.stripe_connect_account_id) {
      console.error("Payout blocked: initiator has no Connect account", { group: g.id });
      continue;
    }

    const { data: payments } = await admin
      .from("payments")
      .select("*")
      .eq("ride_group_id", g.id)
      .in("status", ["paid", "retained", "transfer_failed"]);

    let allOk = true;
    let totalTransferred = 0;
    for (const payment of (payments ?? []) as PaymentRow[]) {
      try {
        await transferShare(admin, stripe, payment, initiator.stripe_connect_account_id);
        totalTransferred += payment.share_cents;
      } catch (err) {
        console.error("Transfer failed", { payment: payment.id, error: (err as Error).message });
        await admin.from("payments").update({ status: "transfer_failed" }).eq("id", payment.id);
        allOk = false;
        results.transfer_errors++;
      }
    }

    if (allOk) {
      await admin.from("ride_groups").update({ status: "completed" }).eq("id", g.id);
      if (initiator.email && totalTransferred > 0) {
        const { emailCtx } = await loadGroup(admin, g.id);
        await enqueueEmail(admin, initiator.email, templates.payout_sent(emailCtx, totalTransferred), "payout_sent");
      }
      results.completed++;
    }
  }

  return json(results);
}));
