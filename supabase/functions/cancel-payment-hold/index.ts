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

    const { ride_group_id } = await req.json();
    if (!ride_group_id) throw new Error("Missing ride_group_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find all authorized/pending payments for this user in this group
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, stripe_payment_intent_id, status")
      .eq("ride_group_id", ride_group_id)
      .eq("user_id", user.id)
      .in("status", ["authorized", "pending"]);

    const results = [];
    for (const payment of payments || []) {
      try {
        await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
        await supabaseAdmin
          .from("payments")
          .update({ status: "canceled" })
          .eq("id", payment.id);
        results.push({ id: payment.id, status: "canceled" });
      } catch (err: any) {
        // If already canceled/captured, just update DB
        console.error(`Failed to cancel ${payment.stripe_payment_intent_id}:`, err.message);
        if (err.message?.includes("canceled") || err.message?.includes("succeeded")) {
          await supabaseAdmin
            .from("payments")
            .update({ status: err.message.includes("succeeded") ? "captured" : "canceled" })
            .eq("id", payment.id);
        }
        results.push({ id: payment.id, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ canceled: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Cancel payment hold error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
