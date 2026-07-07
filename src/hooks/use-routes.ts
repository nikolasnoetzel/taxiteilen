import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CityRow, HubRow, RouteRow, TaxiCompanyRow } from "@/integrations/supabase/types";

export interface RouteWithPlaces extends RouteRow {
  hub: HubRow;
  city: CityRow;
}

export function routeLabel(route: RouteWithPlaces, direction: "to_hub" | "from_hub"): string {
  return direction === "to_hub"
    ? `${route.city.name} → ${route.hub.name}`
    : `${route.hub.name} → ${route.city.name}`;
}

export function useRoutes() {
  return useQuery({
    queryKey: ["routes"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<RouteWithPlaces[]> => {
      const { data, error } = await supabase
        .from("routes")
        .select("*, hubs(*), cities(*)")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []).map((r) => {
        const { hubs, cities, ...route } = r as RouteRow & { hubs: HubRow; cities: CityRow };
        return { ...route, hub: hubs, city: cities };
      });
    },
  });
}

export function useRouteTaxiCompanies(routeId: string | undefined) {
  return useQuery({
    queryKey: ["route-taxi-companies", routeId],
    enabled: Boolean(routeId),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TaxiCompanyRow[]> => {
      const { data, error } = await supabase
        .from("route_taxi_companies")
        .select("priority, taxi_companies(*)")
        .eq("route_id", routeId!)
        .order("priority");
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.taxi_companies as unknown as TaxiCompanyRow)
        .filter((c) => c?.active);
    },
  });
}
