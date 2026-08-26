// Stripe webhook — source of truth for payment state.
// Register the endpoint for BOTH account and Connect events (docs/stripe-setup.md).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import type Stripe from "https://esm.sh/stripe@18.5.0";
import { adminClient } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { refundPayment, PaymentRow } from "../_shared/money.ts";
import { loadGroup, loadProfiles, firstName } from "../_shared/rides.ts";
import { enqueueEmail, templates } from "../_shared/emails.ts";

serve(async (req) => {
  const stripe = stripeClient();
  const signingSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET") || "";

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, signingSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = adminClient();

  try {
    switch (event.type) {
      // ----- rider paid: activate membership, confirm, notify group -----
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;
        const membershipId = session.metadata?.membership_id;
        const groupId = session.metadata?.ride_group_id;
        if (!paymentId || !membershipId || !groupId) break;

        // Resolve the charge id (needed for source_transaction on payout)
        let chargeId: string | null = null;
        const piId = session.payment_intent as string | null;
        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId);
          chargeId = (pi.latest_charge as string) ?? null;
        }

        const { data: payment } = await admin
          .from("payments")
          .update({
            status: "paid",
            stripe_payment_intent_id: piId,
            stripe_charge_id: chargeId,
            paid_at: new Date().toISOString(),
          })
          .eq("id", paymentId)
          .in("status", ["requires_payment", "failed"]) // idempotent
          .select("*")
          .maybeSingle();

        // Backstop: a SECOND completed session for the same payment (e.g. an
        // old checkout tab from the retry path, or completion after a refund)
        // must never silently keep the extra money.
        if (!payment && piId) {
          const { data: existingPayment } = await admin
            .from("payments")
            .select("id, status, stripe_payment_intent_id")
            .eq("id", paymentId)
            .maybeSingle();
          if (existingPayment && existingPayment.stripe_payment_intent_id !== piId) {
            console.warn("Duplicate checkout completion — refunding the extra charge", {
              paymentId, duplicateIntent: piId, keptIntent: existingPayment.stripe_payment_intent_id,
            });
            await stripe.refunds.create(
              { payment_intent: piId },
              { idempotencyKey: `dup-refund-${piId}` }
            );
            break;
          }
        }

        const { data: activated } = await admin
          .from("memberships")
          .update({ status: "active", pending_expires_at: null })
          .eq("id", membershipId)
          .eq("status", "pending_payment")
          .select("id")
          .maybeSingle();

        // Backstop: payment completed after the seat expired, the rider
        // cancelled, or the ride was dissolved — money without a seat is
        // always refunded immediately.
        if (payment && !activated) {
          const { data: membership } = await admin
            .from("memberships")
            .select("status")
            .eq("id", membershipId)
            .maybeSingle();
          if (membership?.status !== "active") {
            console.warn("Checkout completed without an activatable membership — auto-refunding", {
              paymentId, membershipId, membershipStatus: membership?.status,
            });
            await refundPayment(admin, stripe, payment as PaymentRow);
            break;
          }
        }
        if (payment) {
          const { data: groupRow } = await admin
            .from("ride_groups")
            .select("status")
            .eq("id", groupId)
            .maybeSingle();
          if (groupRow?.status === "cancelled") {
            console.warn("Checkout completed for a cancelled ride — auto-refunding", { paymentId, groupId });
            await refundPayment(admin, stripe, payment as PaymentRow);
            break;
          }
        }

        if (payment) {
          const { group, emailCtx } = await loadGroup(admin, groupId);
          const { data: members } = await admin
            .from("memberships")
            .select("user_id, num_persons, status, role")
            .eq("ride_group_id", groupId)
            .in("status", ["active", "pending_payment"]);
          const takenSeats = (members ?? []).reduce((sum, m) => sum + m.num_persons, 0);
          const seatsLeft = Math.max(group.seats_total - takenSeats, 0);

          const userIds = [payment.user_id, ...(members ?? []).map((m) => m.user_id)];
          const profiles = await loadProfiles(admin, [...new Set(userIds)]);

          const rider = profiles.get(payment.user_id);
          if (rider?.email) {
            await enqueueEmail(admin, rider.email,
              templates.join_confirmed(emailCtx, payment.amount_cents), "join_confirmed");
          }
          const others = (members ?? []).filter(
            (m) => m.user_id !== payment.user_id && m.status === "active");
          for (const m of others) {
            const email = profiles.get(m.user_id)?.email;
            if (email) {
              await enqueueEmail(admin, email,
                templates.new_rider(emailCtx, firstName(rider), seatsLeft), "new_rider");
            }
          }
        }
        break;
      }

      // ----- checkout abandoned: free the seat -----
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;
        const membershipId = session.metadata?.membership_id;
        if (paymentId) {
          await admin.from("payments").update({ status: "failed" })
            .eq("id", paymentId).eq("status", "requires_payment");
        }
        if (membershipId) {
          await admin.from("memberships").update({ status: "expired" })
            .eq("id", membershipId).eq("status", "pending_payment");
        }
        break;
      }

      // ----- reconcile refunds triggered outside our own flows -----
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await admin
          .from("payments")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("stripe_charge_id", charge.id)
          .in("status", ["paid", "retained"]);
        break;
      }

      // ----- card chargeback: pause payout via an internal dispute -----
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = dispute.charge as string;
        const { data: payment } = await admin
          .from("payments")
          .select("id, ride_group_id, user_id, status")
          .eq("stripe_charge_id", chargeId)
          .maybeSingle();
        if (payment) {
          await admin.from("disputes").insert({
            ride_group_id: payment.ride_group_id,
            raised_by: payment.user_id,
            reason: `Stripe chargeback (${dispute.id})`,
          });
          if (payment.status === "transferred") {
            console.error("Chargeback on already-transferred payment — manual transfer reversal needed", {
              payment: payment.id, stripe_dispute: dispute.id,
            });
          }
        }
        break;
      }

      // ----- Connect onboarding progress -----
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const complete = Boolean(
          account.details_submitted && account.charges_enabled && account.payouts_enabled
        );
        await admin
          .from("profiles")
          .update({ stripe_connect_onboarding_complete: complete })
          .eq("stripe_connect_account_id", account.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", event.type, (err as Error).message);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
