import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, Clock, Users, CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MatchingGroup = {
  id: string;
  route_id: string;
  ride_date: string | null;
  status: string;
  member_count: number;
  times: string[];
};

const SearchResults = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fromQ = params.get("from") || "";
  const toQ = params.get("to") || "";
  const dateQ = params.get("date") || format(new Date(), "yyyy-MM-dd");
  const timeQ = params.get("time") || "12:00";

  const [groups, setGroups] = useState<MatchingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      // Find open ride groups on the same date within ±120 min
      const { data: rideGroups } = await supabase
        .from("ride_groups")
        .select("id, route_id, ride_date, status")
        .eq("status", "open")
        .eq("ride_date", dateQ);

      if (!rideGroups || rideGroups.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Get ride requests for these groups
      const groupIds = rideGroups.map((g) => g.id);
      const { data: requests } = await supabase
        .from("ride_requests")
        .select("ride_group_id, estimated_arrival, desired_time, num_persons")
        .in("ride_group_id", groupIds);

      const targetMin = parseInt(timeQ.split(":")[0]) * 60 + parseInt(timeQ.split(":")[1]);

      const matched: MatchingGroup[] = rideGroups
        .map((g) => {
          const reqs = (requests || []).filter((r) => r.ride_group_id === g.id);
          const times = reqs.map((r) => r.desired_time || r.estimated_arrival);
          // Check if any request is within ±120 min
          const hasMatch = reqs.some((r) => {
            const t = r.desired_time || r.estimated_arrival;
            const [h, m] = t.split(":").map(Number);
            return Math.abs(h * 60 + m - targetMin) <= 120;
          });
          if (!hasMatch && reqs.length > 0) return null;
          return {
            id: g.id,
            route_id: g.route_id,
            ride_date: g.ride_date,
            status: g.status,
            member_count: reqs.reduce((sum, r) => sum + r.num_persons, 0),
            times,
          };
        })
        .filter(Boolean) as MatchingGroup[];

      setGroups(matched);
      setLoading(false);
    };
    fetchGroups();
  }, [dateQ, timeQ]);

  const handleCreateNew = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Navigate to a general route page with search params
    navigate(`/route/custom?from=${encodeURIComponent(fromQ)}&to=${encodeURIComponent(toQ)}&date=${dateQ}&time=${timeQ}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>

          {/* Search summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 font-medium text-primary">
                <MapPin className="h-3.5 w-3.5" />
                {fromQ}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 font-medium text-destructive">
                <MapPin className="h-3.5 w-3.5" />
                {toQ}
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(parse(dateQ, "yyyy-MM-dd", new Date()), "dd. MMM yyyy", { locale: de })}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {timeQ} Uhr (±2 Std.)
              </span>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : groups.length > 0 ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-foreground">
                {groups.length} passende Fahrgruppe{groups.length !== 1 ? "n" : ""} gefunden
              </h2>
              {groups.map((group) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                  onClick={() => navigate(`/route/${group.route_id}?group=${group.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        Fahrgruppe · {group.route_id}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Zeiten: {group.times.join(", ")} Uhr
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Users className="h-3 w-3" />
                        {group.member_count} Person{group.member_count !== 1 ? "en" : ""}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-dashed border-border bg-card p-8 text-center"
            >
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <h3 className="mb-1 font-display text-lg font-semibold text-card-foreground">
                Noch keine Mitfahrer gefunden
              </h3>
              <p className="mb-5 text-sm text-muted-foreground">
                Sei der Erste! Erstelle eine Fahrgruppe und andere können sich anschließen.
              </p>
              <Button onClick={handleCreateNew} className="gap-2 font-display font-semibold">
                Fahrgruppe erstellen
              </Button>
            </motion.div>
          )}

          {groups.length > 0 && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={handleCreateNew} className="gap-2">
                Neue Fahrgruppe erstellen
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchResults;
