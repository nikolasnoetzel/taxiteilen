#!/usr/bin/env node
// Idempotent Stripe setup for TaxiTeilen (test OR live mode — depends on the key).
//
// Usage:
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-bootstrap.mjs
//
// What it does:
//   1. Verifies the key and prints the account.
//   2. Creates (or finds) the webhook endpoint pointing at the Supabase
//      edge function and prints the signing secret — set it as the
//      STRIPE_WEBHOOK_SIGNING_SECRET secret in Supabase/Lovable Cloud.
//   3. Prints the remaining manual steps (Connect activation can't be done via API).
//
// The key is read from the environment only. Never commit keys.

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "gabdgtrutcbozhpltxxn";
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/stripe-webhook`;
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "charge.refunded",
  "charge.dispute.created",
  "account.updated",
];

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Run: STRIPE_SECRET_KEY=sk_... node scripts/stripe-bootstrap.mjs");
  process.exit(1);
}

async function stripe(path, method = "GET", body = null) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${data.error?.message || res.status}`);
  return data;
}

const account = await stripe("account");
const mode = key.startsWith("sk_live") ? "LIVE" : "TEST";
console.log(`✔ Stripe account: ${account.settings?.dashboard?.display_name || account.id} (${mode} mode)`);

// Webhook endpoint (idempotent by URL)
const endpoints = await stripe("webhook_endpoints?limit=100");
let endpoint = endpoints.data.find((e) => e.url === WEBHOOK_URL);
if (endpoint) {
  console.log(`✔ Webhook endpoint exists: ${endpoint.id}`);
  console.log("  (Signing secret is only shown at creation — check the Stripe dashboard if you lost it.)");
} else {
  const params = { url: WEBHOOK_URL, description: "TaxiTeilen Supabase edge function" };
  EVENTS.forEach((e, i) => (params[`enabled_events[${i}]`] = e));
  endpoint = await stripe("webhook_endpoints", "POST", params);
  console.log(`✔ Webhook endpoint created: ${endpoint.id}`);
  console.log(`\n  >>> STRIPE_WEBHOOK_SIGNING_SECRET=${endpoint.secret}\n`);
  console.log("  Set this as a secret in Supabase/Lovable Cloud now — it won't be shown again.");
}

console.log(`
Manual steps remaining (Stripe Dashboard, ${mode} mode):
  1. Connect → activate, platform type "Marketplace", Express accounts, country DE.
     Complete the platform profile and accept loss liability
     (required for separate charges & transfers).
  2. Connect → Branding: set name, icon, brand color (shown during Express onboarding).
  3. Supabase/Lovable Cloud secrets: STRIPE_SECRET_KEY (this key) and the
     STRIPE_WEBHOOK_SIGNING_SECRET printed above.
Full checklist: docs/stripe-setup.md`);
