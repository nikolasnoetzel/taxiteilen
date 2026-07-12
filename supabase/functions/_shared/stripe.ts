import Stripe from "https://esm.sh/stripe@18.5.0";

export function stripeClient(): Stripe {
  // STRIPE_TEST_API_KEY is the name Lovable Cloud's Stripe integration uses
  const key = Deno.env.get("STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_TEST_API_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

export type { Stripe };
