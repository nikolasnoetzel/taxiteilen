import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Route price data (known routes get specific pricing, custom routes use a default)
const ROUTE_PRICES: Record<string, { min: number; max: number }> = {
  "ham-kiel": { min: 100, max: 150 },
  "kiel-ham": { min: 100, max: 150 },
};
const DEFAULT_ROUTE_PRICE = { min: 80, max: 200 };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user?.email) throw new Error("Not authenticated");

    const { ride_group_id, num_persons } = await req.json();
    if (!ride_group_id) throw new Error("Missing ride_group_id");
    const riderPersons = Math.min(Math.max(num_persons || 1, 1), 4);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get ride group info (route_id, created_by)
    const { data: rideGroup } = await supabaseAdmin
      .from("ride_groups")
      .select("created_by, route_id")
      .eq("id", ride_group_id)
      .single();

    if (!rideGroup) throw new Error("Ride group not found");

    // Calculate amount server-side from route price and total persons
    const routePrice = ROUTE_PRICES[rideGroup.route_id] || DEFAULT_ROUTE_PRICE;
    const estimatedTotal = (routePrice.min + routePrice.max) / 2;

    // Count total persons in the group (including this rider)
    const { data: allRiders } = await supabaseAdmin
      .from("ride_requests")
      .select("num_persons")
      .eq("ride_group_id", ride_group_id);

    const existingPersons = (allRiders || []).reduce((sum: number, r: any) => sum + (r.num_persons || 1), 0);
    const totalPersons = existingPersons; // rider already inserted their ride_request before paying
    const serviceFee = estimatedTotal * 0.1;
    const perPersonCents = Math.ceil(((estimatedTotal + serviceFee) / totalPersons) * 100);
    const amount_cents = perPersonCents * riderPersons;
    const platformFeeCents = Math.round(amount_cents * 0.1);

    // Get or create Stripe customer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // Get the initiator's Connect account
    const { data: initiatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("user_id", rideGroup.created_by)
      .single();

    if (!initiatorProfile?.stripe_connect_account_id) {
      throw new Error("Initiator has not completed payment onboarding");
    }

    // Create Checkout session with capture_method: manual
    const origin = req.headers.get("origin") || "https://taxiteilen.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_intent_data: {
        capture_method: "manual",
        receipt_email: user.email!,
        transfer_data: {
          destination: initiatorProfile.stripe_connect_account_id,
        },
        application_fee_amount: platformFeeCents,
      },
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "TaxiTeilen – Vorab-Reservierung",
              description: `Geschätzter Anteil für ${riderPersons} Person(en). Der finale Betrag wird nach der Fahrt abgerechnet.`,
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&ride_group_id=${ride_group_id}`,
      cancel_url: `${origin}/route/${rideGroup.route_id}?payment=canceled`,
    });

    // Store payment record
    if (session.payment_intent) {
      await supabaseAdmin.from("payments").insert({
        ride_group_id,
        user_id: user.id,
        stripe_payment_intent_id: session.payment_intent as string,
        amount_authorized: amount_cents,
        platform_fee: platformFeeCents,
        status: "pending",
      });
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment hold error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
