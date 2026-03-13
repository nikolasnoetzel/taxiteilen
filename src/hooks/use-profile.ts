import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyRides() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-rides", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all ride requests for this user
      const { data: requests, error } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      // Get ride groups for these requests
      const groupIds = [...new Set(requests.map((r) => r.ride_group_id))];
      const { data: groups } = await supabase
        .from("ride_groups")
        .select("*")
        .in("id", groupIds);

      // Get payments for this user
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user!.id);

      const groupMap = new Map((groups || []).map((g) => [g.id, g]));
      const paymentMap = new Map((payments || []).map((p) => [p.ride_group_id, p]));

      return requests.map((req) => ({
        ...req,
        group: groupMap.get(req.ride_group_id) || null,
        payment: paymentMap.get(req.ride_group_id) || null,
      }));
    },
  });
}
