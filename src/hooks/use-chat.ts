import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ChatMessage = {
  id: string;
  ride_group_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: { full_name: string | null };
};

export function useChatMessages(rideGroupId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-messages", rideGroupId],
    enabled: !!rideGroupId,
    queryFn: async () => {
      if (!rideGroupId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("ride_group_id", rideGroupId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profile names
      const userIds = [...new Set((data || []).map((m: any) => m.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p.full_name])
      );

      return (data || []).map((m: any) => ({
        ...m,
        profile: { full_name: profileMap.get(m.user_id) ?? null },
      })) as ChatMessage[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!rideGroupId) return;
    const channel = supabase
      .channel(`chat-${rideGroupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `ride_group_id=eq.${rideGroupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", rideGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideGroupId, queryClient]);

  return query;
}

export function useSendMessage(rideGroupId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!user || !rideGroupId) throw new Error("Nicht eingeloggt");

      const { error } = await supabase.from("chat_messages").insert({
        ride_group_id: rideGroupId,
        user_id: user.id,
        message,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", rideGroupId] });
    },
  });
}
