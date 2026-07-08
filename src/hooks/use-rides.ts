// v2 ride data: search open rides, load one ride with members, my rides.
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { berlinDayRange } from "@/lib/format";
import type {
  MembershipRow,
  PaymentRow,
  RideDirection,
  RideGroupRow,
} from "@/integrations/supabase/types";

export interface RideSearchParams {
  routeId?: string;
  direction?: RideDirection;
  date?: string; // YYYY-MM-DD (Europe/Berlin day)
}

export interface RideGroupWithSeats extends RideGroupRow {
  seats_taken: number;
  members_count: number;
}

function withSeatCounts(
  groups: (RideGroupRow & { memberships: Pick<MembershipRow, "num_persons" | "status">[] })[]
): RideGroupWithSeats[] {
  return groups.map((g) => {
    const live = (g.memberships ?? []).filter((m) =>
      ["active", "pending_payment"].includes(m.status)
    );
    const { memberships: _m, ...group } = g;
    return {
      ...group,
      seats_taken: live.reduce((sum, m) => sum + m.num_persons, 0),
      members_count: live.length,
    };
  });
}

export function useRideSearch(params: RideSearchParams) {
  return useQuery({
    queryKey: ["ride-search", params],
    queryFn: async (): Promise<RideGroupWithSeats[]> => {
      let query = supabase
        .from("ride_groups")
        .select("*, memberships(num_persons, status)")
        .in("status", ["open", "locked"])
        .gt("departure_at", new Date(Date.now() + 60 * 60_000).toISOString())
        .order("departure_at")
        .limit(50);
      if (params.routeId) query = query.eq("route_id", params.routeId);
      if (params.direction) query = query.eq("direction", params.direction);
      if (params.date) {
        // A search day always means the German calendar day
        const { start, end } = berlinDayRange(params.date);
        query = query.gte("departure_at", start).lt("departure_at", end);
      }
      const { data, error } = await query;
      if (error) throw error;
      return withSeatCounts(
        (data ?? []) as unknown as (RideGroupRow & {
          memberships: Pick<MembershipRow, "num_persons" | "status">[];
        })[]
      );
    },
  });
}

export interface RideMember extends MembershipRow {
  profile: { full_name: string | null } | null;
}

export interface RideDetail {
  group: RideGroupRow;
  members: RideMember[];
  seatsTaken: number;
  myMembership: MembershipRow | null;
  myPayment: PaymentRow | null;
}

export function useRideDetail(groupId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ride-detail", groupId, user?.id],
    enabled: Boolean(groupId),
    queryFn: async (): Promise<RideDetail | null> => {
      const { data: group, error } = await supabase
        .from("ride_groups")
        .select("*")
        .eq("id", groupId!)
        .maybeSingle();
      if (error) throw error;
      if (!group) return null;

      const { data: members } = await supabase
        .from("memberships")
        .select("*")
        .eq("ride_group_id", groupId!)
        .in("status", ["active", "pending_payment"])
        .order("joined_at");

      // Profile names are visible to co-members via RLS; fall back gracefully.
      const userIds = (members ?? []).map((m) => m.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

      const enriched: RideMember[] = (members ?? []).map((m) => ({
        ...m,
        profile: { full_name: nameMap.get(m.user_id) ?? null },
      }));

      let myMembership: MembershipRow | null = null;
      let myPayment: PaymentRow | null = null;
      if (user) {
        myMembership = (members ?? []).find((m) => m.user_id === user.id) ?? null;
        if (!myMembership) {
          // May exist with a cancelled/no_show status (not in the list above)
          const { data: mine } = await supabase
            .from("memberships")
            .select("*")
            .eq("ride_group_id", groupId!)
            .eq("user_id", user.id)
            .order("joined_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          myMembership = mine ?? null;
        }
        if (myMembership) {
          const { data: payment } = await supabase
            .from("payments")
            .select("*")
            .eq("membership_id", myMembership.id)
            .maybeSingle();
          myPayment = payment ?? null;
        }
      }

      const seatsTaken = enriched
        .filter((m) => ["active", "pending_payment"].includes(m.status))
        .reduce((sum, m) => sum + m.num_persons, 0);

      return { group, members: enriched, seatsTaken, myMembership, myPayment };
    },
  });

  // Live updates: reload on membership/group changes
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`ride-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memberships", filter: `ride_group_id=eq.${groupId}` },
        () => queryClient.invalidateQueries({ queryKey: ["ride-detail", groupId] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_groups", filter: `id=eq.${groupId}` },
        () => queryClient.invalidateQueries({ queryKey: ["ride-detail", groupId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return query;
}

export interface MyRide {
  membership: MembershipRow;
  group: RideGroupRow;
  payment: PaymentRow | null;
}

export function useMyRides() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-rides", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<MyRide[]> => {
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("*, ride_groups(*), payments(*)")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (memberships ?? [])
        .map((m) => {
          const { ride_groups, payments, ...membership } = m as unknown as MembershipRow & {
            ride_groups: RideGroupRow;
            payments: PaymentRow | PaymentRow[] | null;
          };
          return {
            membership,
            group: ride_groups,
            payment: Array.isArray(payments) ? payments[0] ?? null : payments,
          };
        })
        .filter((r) => r.group);
    },
  });
}
