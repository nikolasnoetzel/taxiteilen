import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plane,
  Clock,
  Users,
  Phone,
  AlertCircle,
  CheckCircle,
  Search,
  Loader2,
} from "lucide-react";
import { ROUTES, MOCK_FLIGHTS, getCostPerPerson } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { useRideRequests, useJoinRide } from "@/hooks/use-rides";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; className: string }> = {
    "on-time": { label: "Pünktlich", className: "bg-taxi-success/10 text-taxi-success" },
    delayed: { label: "Verspätet", className: "bg-primary/10 text-primary" },
    landed: { label: "Gelandet", className: "bg-taxi-info/10 text-taxi-info" },
    cancelled: { label: "Gestrichen", className: "bg-destructive/10 text-destructive" },
  };
  const c = config[status] || config["on-time"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {status === "on-time" ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {c.label}
    </span>
  );
};

const RoutePage = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const route = ROUTES.find((r) => r.id === routeId);
  const [flightSearch, setFlightSearch] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);

  const selectedFlightData = selectedFlight
    ? MOCK_FLIGHTS.find((f) => f.flightNumber === selectedFlight)
    : null;

  const { data: rideRequests = [], isLoading: loadingRequests } = useRideRequests(
    routeId,
    selectedFlightData?.estimatedArrival ?? null
  );

  const joinRide = useJoinRide(routeId);

  // Realtime subscription for live updates
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!routeId) return;
    const channel = supabase
      .channel(`ride-requests-${routeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests", filter: `route_id=eq.${routeId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["ride-requests"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [routeId, queryClient]);

  if (!route) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Route nicht gefunden.</p>
        </div>
      </div>
    );
  }

  const filteredFlights = MOCK_FLIGHTS.filter(
    (f) =>
      f.flightNumber.toLowerCase().includes(flightSearch.toLowerCase()) ||
      f.origin.toLowerCase().includes(flightSearch.toLowerCase())
  );

  // Exclude current user from display count
  const otherRequests = rideRequests.filter((r) => r.user_id !== user?.id);
  const userAlreadyJoined = rideRequests.some((r) => r.user_id === user?.id);
  const totalRiders = rideRequests.length + (userAlreadyJoined ? 0 : 1); // +1 for potential join
  const estimatedTotal = (route.estimatedPrice.min + route.estimatedPrice.max) / 2;

  const handleJoin = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!selectedFlightData) return;
    joinRide.mutate({
      flightNumber: selectedFlightData.flightNumber,
      scheduledArrival: selectedFlightData.scheduledArrival,
      estimatedArrival: selectedFlightData.estimatedArrival,
      flightStatus: selectedFlightData.status,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Header */}
      <div className="taxi-gradient-hero px-4 py-10">
        <div className="container mx-auto max-w-3xl">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary-foreground/60 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
          <h1 className="mb-2 font-display text-2xl font-bold text-secondary-foreground md:text-3xl">
            {route.from} → {route.to}
          </h1>
          <p className="text-secondary-foreground/60">
            {route.estimatedDuration} · {route.estimatedPrice.min}–{route.estimatedPrice.max} €
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl flex-1 px-4 py-8">
        {/* Flight search */}
        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
            <Plane className="mb-0.5 mr-2 inline-block h-5 w-5 text-primary" />
            Wann kommst du an?
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="z.B. LH 2084 oder München"
              value={flightSearch}
              onChange={(e) => setFlightSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-card py-3 pl-11 pr-4 text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Flight list */}
          <div className="mt-4 space-y-2">
            {filteredFlights.map((flight) => (
              <motion.button
                key={flight.flightNumber}
                layout
                onClick={() => setSelectedFlight(flight.flightNumber)}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
                  selectedFlight === flight.flightNumber
                    ? "border-primary bg-primary/5 taxi-shadow-card"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div>
                  <div className="font-display font-semibold text-card-foreground">
                    {flight.flightNumber}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {flight.airline} · aus {flight.origin} ({flight.originCode})
                  </div>
                  {flight.gate && (
                    <div className="text-xs text-muted-foreground">
                      Gate {flight.gate} · {flight.terminal}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-sm text-card-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {flight.scheduledArrival}
                    {flight.estimatedArrival !== flight.scheduledArrival && (
                      <span className="text-xs text-primary">→ {flight.estimatedArrival}</span>
                    )}
                  </div>
                  <StatusBadge status={flight.status} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Matching riders */}
        {selectedFlight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              <Users className="mb-0.5 mr-2 inline-block h-5 w-5 text-primary" />
              Mitfahrer in deinem Zeitfenster
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Personen die ±60 Minuten um {selectedFlightData?.estimatedArrival} Uhr ankommen
            </p>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : otherRequests.length > 0 ? (
              <div className="space-y-3">
                {otherRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                  >
                    <div>
                      <div className="font-medium text-card-foreground">
                        {req.profile?.full_name || "Mitfahrer"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ankunft {req.estimated_arrival}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.is_initiator && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          Initiator
                        </span>
                      )}
                      <StatusBadge status={req.flight_status} />
                    </div>
                  </div>
                ))}

                {/* Cost preview */}
                <div className="rounded-lg bg-secondary p-5 text-center">
                  <p className="mb-1 text-sm text-secondary-foreground/60">
                    Geschätzte Kosten pro Person ({rideRequests.length + (userAlreadyJoined ? 0 : 1)} Personen, inkl. 10% Gebühr)
                  </p>
                  <p className="font-display text-3xl font-bold text-secondary-foreground">
                    {getCostPerPerson(estimatedTotal, rideRequests.length + (userAlreadyJoined ? 0 : 1))} €
                  </p>
                </div>

                {!userAlreadyJoined && (
                  <button
                    onClick={handleJoin}
                    disabled={joinRide.isPending}
                    className="w-full rounded-lg bg-primary py-3 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {joinRide.isPending ? (
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    ) : (
                      "Jetzt beitreten & Taxi teilen"
                    )}
                  </button>
                )}

                {userAlreadyJoined && (
                  <p className="text-center text-sm font-medium text-primary">
                    ✓ Du bist bereits eingetragen
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                {userAlreadyJoined ? (
                  <>
                    <p className="mb-1 font-medium text-card-foreground">Du bist eingetragen!</p>
                    <p className="text-sm text-muted-foreground">
                      Sobald andere mit ähnlicher Ankunftszeit dazukommen, siehst du sie hier.
                    </p>
                    <p className="mt-3 text-sm font-medium text-primary">
                      ✓ Du bist bereits eingetragen
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-1 font-medium text-card-foreground">Noch keine Mitfahrer in deinem Zeitfenster</p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Sei der Erste! Trage dich ein und andere mit ähnlicher Ankunftszeit werden dich finden.
                    </p>
                    <button
                      onClick={handleJoin}
                      disabled={joinRide.isPending}
                      className="rounded-lg bg-primary px-8 py-3 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      {joinRide.isPending ? (
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      ) : (
                        "Als Erster eintragen"
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Taxi companies */}
        <div>
          <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
            <Phone className="mb-0.5 mr-2 inline-block h-5 w-5 text-primary" />
            Taxiunternehmen
          </h2>
          <div className="space-y-3">
            {route.taxiCompanies.map((company) => (
              <div
                key={company.name}
                className="rounded-lg border border-border bg-card p-5 taxi-shadow-card"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-display font-semibold text-card-foreground">{company.name}</h3>
                  <a
                    href={`tel:${company.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
                  >
                    <Phone className="h-4 w-4" />
                    Anrufen
                  </a>
                </div>
                <p className="text-sm text-muted-foreground">{company.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RoutePage;
