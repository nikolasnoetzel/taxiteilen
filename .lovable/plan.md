

# TaxiTeilen Launch-Readiness Audit & Action Plan

## Current State Summary
The core flow exists: Landing page, flight selection, ride matching, Stripe payment (pre-auth + capture), group chat, and dashboard. However, there are several issues that need fixing before going live.

---

## Priority 1: Critical Bugs (must fix before launch)

### 1.1 Ride Group Logic: No Date Separation
Ride groups have a `ride_date` column but it's never set. All ride requests for a route go into ONE open group regardless of date. A user joining today gets matched with someone from last week.
- **Fix:** Set `ride_date` to today when creating a ride group. Filter open groups by date when joining.

### 1.2 Ride Request Time Window: Only ±60 min filter, no date filter
`useRideRequests` fetches ALL ride requests for a route (no date filter), then filters by ±60 min time window. This means old requests from past days still show up if times overlap.
- **Fix:** Add `ride_date` filtering to the query.

### 1.3 Cancel URL is wrong
In `create-payment-hold`, the cancel URL uses `ride_group_id` instead of `route_id`:
```
cancel_url: `${origin}/route/${ride_group_id}?payment=canceled`
```
This leads to a 404 after canceling payment.
- **Fix:** Look up the `route_id` from the ride group and use that.

### 1.4 Payment amount recalculation logic is fragile
When a new rider joins, the edge function tries to update existing PaymentIntents with the new per-person amount. But `amount_cents` comes from the frontend (already recalculated), and the code uses it for ALL existing payments too -- even though those riders may have different `num_persons`. This could charge the wrong amounts.
- **Fix:** Calculate amounts server-side based on route estimated price and total persons, not from frontend-sent values.

### 1.5 No way to leave/cancel a ride request
Users can join but cannot leave a ride. There's a DELETE RLS policy on `ride_requests` but no UI for it.
- **Fix:** Add a "Austragen" button on the route page and dashboard.

---

## Priority 2: Important for Launch

### 2.1 Dashboard doesn't show route page link properly
Clicking a ride card in the dashboard navigates to `/route/{route_id}`, but the RoutePage requires selecting a flight again to see the group. Users can't easily get back to their group context.
- **Fix:** If user has an active ride for this route, auto-select their flight and show the group.

### 2.2 Profile RLS: Only own profile visible
The profiles RLS only allows users to see their own profile. But `useRideRequests` fetches profiles of other riders to show names -- this silently fails, showing "Mitfahrer" for everyone.
- **Fix:** Add a SELECT policy allowing authenticated users to read `full_name` of users in shared ride groups, OR use a database function.

### 2.3 Flight data: only arrivals, no departures
`get-flights` only fetches arrivals from Hamburg API. For the Kiel→HAM route (to airport), users need departure flights, but the code shows arrival data and labels it as "Abflug".
- **Fix:** Add departure flight fetching for to-airport routes.

### 2.4 No email notifications
When someone joins your ride group, there's no notification. Users have to keep checking the app.
- **Fix:** Send an email (via the existing email queue) when a new rider joins a group.

### 2.5 Stripe Connect status check missing
After Stripe onboarding return, the `stripe_connect_onboarding_complete` flag is never set to `true`. The `stripe-connect-status` function exists but may not be called.
- **Fix:** Verify the onboarding completion flow works end-to-end.

---

## Priority 3: Polish for Launch

### 3.1 Legal pages (Impressum, AGB, Datenschutz)
These likely have placeholder content that needs real company data.

### 3.2 Mobile responsiveness check
Verify all pages work well on mobile viewports.

### 3.3 Error handling & loading states
Add better error boundaries and offline handling.

### 3.4 SEO & Open Graph meta tags
Add proper meta tags for social sharing.

### 3.5 Clean up test data
Delete old ride_requests and ride_groups from the database before launch.

---

## Recommended Approach

Instead of fixing bugs one by one in chat, I suggest we work through the priorities in batches:

1. **Batch 1** (this session): Fix P1 items 1.1-1.5 -- these are data integrity and payment issues
2. **Batch 2**: Fix P2 items -- UX and notification improvements  
3. **Batch 3**: Polish items

Shall I start with Batch 1?

