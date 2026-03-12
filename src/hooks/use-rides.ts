import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type RideRequestRow = {
  id: string;
  ride_group_id: string;
  user_id: string;
  route_id: string;
  flight_number: string;
  scheduled_arrival: string;
  estimated_arrival: string;
  flight_status: string;
  is_initiator: boolean;
  created_at: string;
  profile?: { full_name: string | null } | null;
};

export function useRideRequests(routeId: string | undefined, estimatedArrival: string | null) {
  return useQuery({
    queryKey: ["ride-requests", routeId, estimatedArrival],
    enabled: !!routeId && !!estimatedArrival,
    queryFn: async () => {
      if (!routeId || !estimatedArrival) return [];

      // Get all ride requests for this route
      // No FK to profiles, so we fetch requests then profiles separately
      const { data, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("route_id", routeId);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch profile names for all user_ids
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const [h, m] = estimatedArrival.split(":").map(Number);
      const targetMin = h * 60 + m;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p.full_name])
      );

      return (data as unknown as RideRequestRow[])
        .map((r) => ({ ...r, profile: { full_name: profileMap.get(r.user_id) ?? null } }))
        .filter((r) => {
          const [rh, rm] = r.estimated_arrival.split(":").map(Number);
          return Math.abs(rh * 60 + rm - targetMin) <= 60;
        });
    },
  });
}

export function useJoinRide(routeId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      flightNumber: string;
      scheduledArrival: string;
      estimatedArrival: string;
      flightStatus: string;
      numPersons?: number;
    }) => {
      if (!user || !routeId) throw new Error("Nicht eingeloggt");

      // Check if user already has a request for this route
      const { data: existing } = await supabase
        .from("ride_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("route_id", routeId)
        .maybeSingle();

      if (existing) throw new Error("Du bist bereits für diese Route eingetragen.");

      // Find an open group for this route, or create one
      let groupId: string;
      const { data: openGroup } = await supabase
        .from("ride_groups")
        .select("id")
        .eq("route_id", routeId)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();

      if (openGroup) {
        groupId = openGroup.id;
      } else {
        const { data: newGroup, error: gErr } = await supabase
          .from("ride_groups")
          .insert({ route_id: routeId, created_by: user.id })
          .select("id")
          .single();
        if (gErr) throw gErr;
        groupId = newGroup.id;
      }

      const { error } = await supabase.from("ride_requests").insert({
        ride_group_id: groupId,
        user_id: user.id,
        route_id: routeId,
        flight_number: params.flightNumber,
        scheduled_arrival: params.scheduledArrival,
        estimated_arrival: params.estimatedArrival,
        flight_status: params.flightStatus,
        is_initiator: !openGroup,
        num_persons: params.numPersons || 1,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ride-requests"] });
      toast({ title: "Eingetragen!", description: "Du bist jetzt für diese Fahrt eingetragen." });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });
}
