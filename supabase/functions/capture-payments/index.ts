import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    if (!user) throw new Error("Not authenticated");

    const { ride_group_id, final_price_cents } = await req.json();
    if (!ride_group_id || !final_price_cents) throw new Error("Missing parameters");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user is the initiator
    const { data: rideGroup } = await supabaseAdmin
      .from("ride_groups")
      .select("created_by")
      .eq("id", ride_group_id)
      .single();

    if (!rideGroup || rideGroup.created_by !== user.id) {
      throw new Error("Only the initiator can finalize the ride");
    }

    // Get all riders in this group (with num_persons)
    const { data: rideRequests } = await supabaseAdmin
      .from("ride_requests")
      .select("user_id, num_persons")
      .eq("ride_group_id", ride_group_id);

    if (!rideRequests || rideRequests.length === 0) {
      throw new Error("No riders found");
    }

    const totalPersons = rideRequests.reduce((sum: number, r: any) => sum + (r.num_persons || 1), 0);
    const perPersonCents = Math.ceil(final_price_cents / totalPersons);
    const platformFeeCents = Math.round(perPersonCents * 0.1);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get all payments for this ride group (non-initiator riders)
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("ride_group_id", ride_group_id)
      .in("status", ["authorized", "pending"]);

    const results = [];

    for (const payment of (payments || [])) {
      try {
        // Find the rider's num_persons to calculate their share
        const rider = rideRequests.find((r: any) => r.user_id === payment.user_id);
        const riderPersons = rider?.num_persons || 1;
        const riderShare = perPersonCents * riderPersons;
        const riderFee = Math.round(riderShare * 0.1);
        const finalAmount = Math.min(riderShare + riderFee, payment.amount_authorized);
        
        const paymentIntent = await stripe.paymentIntents.capture(
          payment.stripe_payment_intent_id,
          {
            amount_to_capture: finalAmount,
          }
        );

        await supabaseAdmin
          .from("payments")
          .update({
            amount_captured: finalAmount,
            platform_fee: riderFee,
            status: "captured",
          })
          .eq("id", payment.id);

        results.push({ payment_id: payment.id, status: "captured", amount: finalAmount });
      } catch (err) {
        console.error(`Failed to capture payment ${payment.id}:`, err);
        
        await supabaseAdmin
          .from("payments")
          .update({ status: "failed" })
          .eq("id", payment.id);

        results.push({ payment_id: payment.id, status: "failed", error: err.message });
      }
    }

    // Update ride group with final price and status
    await supabaseAdmin
      .from("ride_groups")
      .update({ final_price: final_price_cents, status: "completed" })
      .eq("id", ride_group_id);

    return new Response(
      JSON.stringify({
        success: true,
        final_price_cents,
        per_person_cents: perPersonCents,
        platform_fee_cents: platformFeeCents,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Capture payments error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
