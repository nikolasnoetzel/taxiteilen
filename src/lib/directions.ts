import type { RouteWithPlaces } from "@/hooks/use-routes";
import type { RideDirection } from "@/integrations/supabase/types";

export interface DirectionalRoute {
  key: string; // `${routeId}:${direction}`
  route: RouteWithPlaces;
  direction: RideDirection;
  from: string;
  to: string;
}

/** Every active route in both directions, as selectable options. */
export function directionalRoutes(routes: RouteWithPlaces[]): DirectionalRoute[] {
  return routes.flatMap((route) => [
    {
      key: `${route.id}:to_hub`,
      route,
      direction: "to_hub" as const,
      from: route.city.name,
      to: route.hub.name,
    },
    {
      key: `${route.id}:from_hub`,
      route,
      direction: "from_hub" as const,
      from: route.hub.name,
      to: route.city.name,
    },
  ]);
}

export function parseDirectionalKey(key: string): { routeId: string; direction: RideDirection } | null {
  const [routeId, direction] = key.split(":");
  if (!routeId || (direction !== "to_hub" && direction !== "from_hub")) return null;
  return { routeId, direction };
}
