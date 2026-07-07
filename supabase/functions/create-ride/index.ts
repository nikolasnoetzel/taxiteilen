// Creates a ride group. The caller becomes the initiator; their own share is
// never charged (they pay the driver in the cab and receive co-rider shares).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, ApiError, handler, json, requireUser } from "../_shared/http.ts";
import { seatPriceCents } from "../_shared/pricing.ts";
import { MIN_LEAD_TIME_MINUTES, payoutDueAt } from "../_shared/policy.ts";
import { loadProfile } from "../_shared/rides.ts";

const MAX_ADVANCE_DAYS = 90;

serve(handler(async (req) => {
  const user = await requireUser(req);
  const admin = adminClient();

  const { route_id, direction, departure_at, meeting_point, seats_total, num_persons } = await req.json();
  if (!route_id || !direction || !departure_at) throw new ApiError("missing_fields");
  if (!["to_hub", "from_hub"].includes(direction)) throw new ApiError("invalid_direction");

  const seats = Math.min(Math.max(Number(seats_total) || 4, 2), 8);
  const persons = Math.min(Math.max(Number(num_persons) || 1, 1), seats - 1);

  const departure = new Date(departure_at);
  if (isNaN(departure.getTime())) throw new ApiError("invalid_departure");
  const now = Date.now();
  if (departure.getTime() < now + MIN_LEAD_TIME_MINUTES * 60_000) {
    throw new ApiError("departure_too_soon", 400, "Abfahrt muss mindestens 1 Stunde in der Zukunft liegen.");
  }
  if (departure.getTime() > now + MAX_ADVANCE_DAYS * 86_400_000) {
    throw new ApiError("departure_too_far", 400, `Fahrten können maximal ${MAX_ADVANCE_DAYS} Tage im Voraus angelegt werden.`);
  }

  const profile = await loadProfile(admin, user.id);
  if (profile.blocked_at) throw new ApiError("account_blocked", 403);
  if (!profile.stripe_connect_account_id || !profile.stripe_connect_onboarding_complete) {
    throw new ApiError("connect_onboarding_required", 403,
      "Um eine Fahrt anzubieten, richte zuerst den Zahlungsempfang ein.");
  }

  const { data: route, error: routeError } = await admin
    .from("routes")
    .select("id, fixed_price_cents, active")
    .eq("id", route_id)
    .single();
  if (routeError || !route || !route.active) throw new ApiError("route_not_found", 404);

  const seatPrice = seatPriceCents(route.fixed_price_cents, seats);

  const { data: group, error: groupError } = await admin
    .from("ride_groups")
    .insert({
      route_id,
      direction,
      departure_at: departure.toISOString(),
      meeting_point: meeting_point?.slice(0, 200) || null,
      seats_total: seats,
      seat_price_cents: seatPrice,
      initiator_id: user.id,
      status: "open",
      payout_due_at: payoutDueAt(departure.toISOString()).toISOString(),
    })
    .select("id")
    .single();
  if (groupError || !group) throw new ApiError("create_failed", 500, groupError?.message);

  const { error: memberError } = await admin.from("memberships").insert({
    ride_group_id: group.id,
    user_id: user.id,
    role: "initiator",
    num_persons: persons,
    status: "active",
  });
  if (memberError) {
    await admin.from("ride_groups").delete().eq("id", group.id);
    throw new ApiError("create_failed", 500, memberError.message);
  }

  return json({ ride_group_id: group.id });
}));
