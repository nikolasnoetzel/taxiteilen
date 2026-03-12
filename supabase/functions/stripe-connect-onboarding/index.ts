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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Use service role to read/write profiles
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user already has a Connect account
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_onboarding_complete, email, full_name")
      .eq("user_id", user.id)
      .single();

    if (profile?.stripe_connect_onboarding_complete) {
      return new Response(
        JSON.stringify({ already_complete: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accountId = profile?.stripe_connect_account_id;

    if (!accountId) {
      // Create Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "DE",
        email: profile?.email || user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          email: profile?.email || user.email,
          first_name: profile?.full_name?.split(" ")[0] || undefined,
          last_name: profile?.full_name?.split(" ").slice(1).join(" ") || undefined,
        },
      });

      accountId = account.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("user_id", user.id);
    }

    // Create onboarding link
    const origin = req.headers.get("origin") || "https://taxiteilen.lovable.app";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/stripe-onboarding?refresh=true`,
      return_url: `${origin}/stripe-onboarding?success=true`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
