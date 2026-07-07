// Reserves a seat (atomic, 30-min TTL) and returns a Stripe Checkout URL.
// Funds land on the PLATFORM balance (separate charges & transfers) — the
// initiator is paid out 48h after departure by cron-payout.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { stripeClient } from "../_shared/stripe.ts";
import { riderCharge } from "../_shared/pricing.ts";
import { PENDING_PAYMENT_TTL_MINUTES } from "../_shared/policy.ts";
import { loadGroup, loadProfile } from "../_shared/rides.ts";

serve(handler(async (req) => {
  const user = await requireUser(req);
  if (!user.email) throw new ApiError("not_authenticated", 401);
  const admin = adminClient();
  const stripe = stripeClient();

  const { ride_group_id, num_persons } = await req.json();
  if (!ride_group_id) throw new ApiError("missing_fields");
  const persons = Math.min(Math.max(Number(num_persons) || 1, 1), 7);

  const profile = await loadProfile(admin, user.id);
  if (profile.blocked_at) throw new ApiError("account_blocked", 403);

  const { group, routeName } = (await loadGroup(admin, ride_group_id));
  if (group.initiator_id === user.id) throw new ApiError("already_member");

  // Atomic seat reservation (row lock prevents overbooking)
  const { data: membershipId, error: reserveError } = await admin.rpc("reserve_membership", {
    p_group: ride_group_id,
    p_user: user.id,
    p_persons: persons,
    p_ttl_minutes: PENDING_PAYMENT_TTL_MINUTES,
  });
  if (reserveError) {
    const code = reserveError.message?.match(
      /group_not_found|group_not_joinable|too_close_to_departure|already_member|not_enough_seats/
    )?.[0] ?? "reserve_failed";
    throw new ApiError(code, 409);
  }

  const charge = riderCharge(group.seat_price_cents, persons);

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      membership_id: membershipId,
      ride_group_id,
      user_id: user.id,
      share_cents: charge.share_cents,
      fee_cents: charge.fee_cents,
      amount_cents: charge.amount_cents,
      status: "requires_payment",
    })
    .select("id")
    .single();
  if (paymentError || !payment) throw new ApiError("payment_create_failed", 500, paymentError?.message);

  // Get or create the Stripe customer
  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.full_name ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
  }

  const origin = req.headers.get("origin") || "https://taxiteilen.lovable.app";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"], // no SEPA: 8-week chargeback right clashes with the retention policy
    expires_at: Math.floor(Date.now() / 1000) + PENDING_PAYMENT_TTL_MINUTES * 60,
    payment_intent_data: {
      receipt_email: user.email,
      transfer_group: ride_group_id,
      metadata: { payment_id: payment.id, membership_id: membershipId, ride_group_id },
    },
    metadata: { payment_id: payment.id, membership_id: membershipId, ride_group_id },
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `TaxiTeilen — ${routeName}`,
            description: `Fester Anteil für ${persons} Person${persons > 1 ? "en" : ""} inkl. 20% Servicegebühr. Kostenlose Stornierung bis 24h vor Abfahrt.`,
          },
          unit_amount: charge.amount_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/fahrt/${ride_group_id}?payment=success`,
    cancel_url: `${origin}/fahrt/${ride_group_id}?payment=cancelled`,
  });

  await admin
    .from("payments")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent as string) ?? null,
    })
    .eq("id", payment.id);

  return json({ url: session.url });
}));
