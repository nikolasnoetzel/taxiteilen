import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { ApiError } from "./http.ts";
import { departureLabel, rideUrl, RideEmailContext } from "./emails.ts";

export interface GroupContext {
  group: {
    id: string;
    route_id: string;
    direction: "to_hub" | "from_hub";
    departure_at: string;
    meeting_point: string | null;
    seats_total: number;
    seat_price_cents: number;
    initiator_id: string;
    status: string;
    takeover_deadline: string | null;
    payout_due_at: string;
  };
  routeName: string;
  emailCtx: RideEmailContext;
}

export async function loadGroup(admin: SupabaseClient, groupId: string): Promise<GroupContext> {
  const { data: group, error } = await admin
    .from("ride_groups")
    .select("*, routes(id, fixed_price_cents, duration_min, hubs(code, name, city_name), cities(name, slug))")
    .eq("id", groupId)
    .single();
  if (error || !group) throw new ApiError("group_not_found", 404);

  const route = group.routes as {
    hubs: { code: string; name: string; city_name: string };
    cities: { name: string; slug: string };
  };
  const routeName =
    group.direction === "to_hub"
      ? `${route.cities.name} → ${route.hubs.name}`
      : `${route.hubs.name} → ${route.cities.name}`;

  return {
    group,
    routeName,
    emailCtx: {
      routeName,
      departureLabel: departureLabel(group.departure_at),
      rideUrl: rideUrl(group.id),
    },
  };
}

export interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean;
  blocked_at: string | null;
  is_admin: boolean;
}

export async function loadProfile(admin: SupabaseClient, userId: string): Promise<ProfileRow> {
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, full_name, email, stripe_customer_id, stripe_connect_account_id, stripe_connect_onboarding_complete, blocked_at, is_admin")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new ApiError("profile_not_found", 404);
  return data as ProfileRow;
}

export async function loadProfiles(admin: SupabaseClient, userIds: string[]): Promise<Map<string, ProfileRow>> {
  if (userIds.length === 0) return new Map();
  const { data } = await admin
    .from("profiles")
    .select("user_id, full_name, email, stripe_customer_id, stripe_connect_account_id, stripe_connect_onboarding_complete, blocked_at, is_admin")
    .in("user_id", userIds);
  return new Map((data ?? []).map((p: ProfileRow) => [p.user_id, p]));
}

export function firstName(p: ProfileRow | undefined): string {
  return p?.full_name?.split(" ")[0] || "Ein Mitfahrer";
}
