import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Flight } from "@/lib/data";

export function useFlights(airportCode: string = "HAM") {
  return useQuery<Flight[]>({
    queryKey: ["flights", airportCode],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-flights", {
        body: null,
        method: "GET",
      });

      // supabase.functions.invoke doesn't support GET query params easily,
      // so we use the full URL approach
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-flights?airport=${airportCode}`,
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        }
      );

      if (!res.ok) throw new Error("Flugdaten konnten nicht geladen werden");

      const json = await res.json();
      console.log(`Flight data source: ${json.source}`);
      return json.flights as Flight[];
    },
    staleTime: 5 * 60 * 1000, // 5 min client-side cache too
    refetchInterval: 5 * 60 * 1000,
  });
}
