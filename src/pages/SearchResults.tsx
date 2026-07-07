import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarX2, Loader2, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { RideCard } from "@/components/RideCard";
import { Button } from "@/components/ui/button";
import { useRideSearch } from "@/hooks/use-rides";
import { useRoutes } from "@/hooks/use-routes";
import type { RideDirection } from "@/integrations/supabase/types";

const SearchResults = () => {
  const [params] = useSearchParams();
  const routeId = params.get("route") ?? undefined;
  const direction = (params.get("richtung") as RideDirection) ?? undefined;
  const date = params.get("datum") ?? undefined;

  const { data: routes } = useRoutes();
  const { data: rides, isLoading } = useRideSearch({ routeId, direction, date });

  const routeMap = new Map((routes ?? []).map((r) => [r.id, r]));
  const results = (rides ?? []).filter((r) => routeMap.has(r.route_id));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="border-b border-border bg-card/50">
          <div className="container py-8">
            <h1 className="mb-6 text-2xl font-bold md:text-3xl">Fahrt finden</h1>
            <SearchBar className="max-w-4xl" />
          </div>
        </div>

        <div className="container py-10">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fahrten werden geladen …
            </div>
          ) : results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-md py-20 text-center"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <CalendarX2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold">Noch keine Fahrt auf dieser Strecke</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sei die erste Person: Biete die Fahrt an und andere schließen sich
                dir an — jede Mitfahrt senkt deine Kosten.
              </p>
              <Button className="mt-6" asChild>
                <Link to={`/fahrt-erstellen${routeId ? `?route=${routeId}&richtung=${direction ?? "to_hub"}${date ? `&datum=${date}` : ""}` : ""}`}>
                  <Plus /> Fahrt anbieten
                </Link>
              </Button>
            </motion.div>
          ) : (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                {results.length} {results.length === 1 ? "Fahrt" : "Fahrten"} gefunden
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((ride, i) => (
                  <motion.div
                    key={ride.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <RideCard ride={ride} route={routeMap.get(ride.route_id)!} />
                  </motion.div>
                ))}
              </div>
              <div className="mt-10 rounded-2xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Keine passende Zeit dabei?{" "}
                  <Link
                    to={`/fahrt-erstellen${routeId ? `?route=${routeId}&richtung=${direction ?? "to_hub"}` : ""}`}
                    className="font-semibold text-foreground underline underline-offset-4 hover:no-underline"
                  >
                    Biete deine eigene Fahrt an
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SearchResults;
