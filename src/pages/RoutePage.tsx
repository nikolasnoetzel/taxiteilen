import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
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
  Timer,
  LogOut,
} from "lucide-react";
import { ROUTES, getCostPerPerson } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { useRideRequests, useJoinRide, useLeaveRide } from "@/hooks/use-rides";
import { useFlights } from "@/hooks/use-flights";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaymentButton from "@/components/PaymentButton";
import FinalizeRide from "@/components/FinalizeRide";
import GroupChat from "@/components/GroupChat";

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

function getPaymentDaysLeft(createdAt: string): number {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

const PaymentExpiryBadge = ({ createdAt }: { createdAt: string }) => {
  const daysLeft = getPaymentDaysLeft(createdAt);
  if (daysLeft === 0) {
    return (
      <p className="mt-1 text-xs font-medium text-destructive">
        ⚠️ Reservierung abgelaufen
      </p>
    );
  }
  if (daysLeft <= 2) {
    return (
      <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Timer className="mb-0.5 mr-0.5 inline-block h-3 w-3" />
        Läuft in {daysLeft} {daysLeft === 1 ? "Tag" : "Tagen"} ab
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Gültig noch {daysLeft} Tage
    </p>
  );
};

const UserJoinedSection = ({
  rideGroupId,
  rideRequestId,
  routeFrom,
  routeTo,
  userIsInitiator,
  estimatedPerPersonCents,
  userNumPersons,
  userId,
}: {
  rideGroupId: string | null;
  rideRequestId: string | null;
  routeFrom: string;
  routeTo: string;
  userIsInitiator: boolean;
  estimatedPerPersonCents: number;
  userNumPersons: number;
  userId?: string;
}) => {
  const leaveRide = useLeaveRide();

  const { data: existingPayment, isLoading: loadingPayment } = useQuery({
    queryKey: ["user-payment", rideGroupId, userId],
    queryFn: async () => {
      if (!rideGroupId || !userId) return null;
      const { data } = await supabase
        .from("payments")
        .select("id, status, amount_authorized, created_at")
        .eq("ride_group_id", rideGroupId)
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!rideGroupId && !!userId && !userIsInitiator,
  });

  const hasActivePayment = existingPayment && ["authorized", "pending", "captured"].includes(existingPayment.status);

  const paymentStatusLabel: Record<string, string> = {
    pending: "Zahlung wird verarbeitet…",
    authorized: "Betrag reserviert ✓",
    captured: "Bezahlt ✓",
    canceled: "Storniert",
    failed: "Fehlgeschlagen",
  };

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium text-primary">
        ✓ Du bist bereits eingetragen
      </p>

      {!userIsInitiator && rideGroupId && !loadingPayment && (
        existingPayment ? (
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <p className="text-sm font-medium text-card-foreground">
              {paymentStatusLabel[existingPayment.status] || existingPayment.status}
            </p>
            <p className="text-xs text-muted-foreground">
              {(existingPayment.amount_authorized / 100).toFixed(0)} € reserviert
            </p>
            {(existingPayment.status === "authorized" || existingPayment.status === "pending") && (
              <PaymentExpiryBadge createdAt={existingPayment.created_at} />
            )}
          </div>
        ) : (
          <PaymentButton
            rideGroupId={rideGroupId}
            estimatedAmountCents={estimatedPerPersonCents}
            numPersons={userNumPersons}
          />
        )
      )}

      {rideGroupId && (
        <GroupChat
          rideGroupId={rideGroupId}
          routeName={`${routeFrom} → ${routeTo}`}
        />
      )}

      {/* Leave ride button — only if no active payment */}
      {rideRequestId && !hasActivePayment && (
        <button
          onClick={() => {
            if (confirm("Möchtest du dich wirklich austragen?")) {
              leaveRide.mutate(rideRequestId);
            }
          }}
          disabled={leaveRide.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {leaveRide.isPending ? "Wird ausgetragen…" : "Austragen"}
        </button>
      )}
    </div>
  );
};

const RoutePage = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const route = ROUTES.find((r) => r.id === routeId);
  const [flightSearch, setFlightSearch] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [numPersons, setNumPersons] = useState(1);
  const ridersRef = useRef<HTMLDivElement>(null);

  // Determine direction: is destination the airport?
  const isToAirport = route ? route.toShort === route.airportCode : false;

  const { data: flights = [], isLoading: loadingFlights } = useFlights(route?.airportCode);

  const selectedFlightData = selectedFlight
    ? flights.find((f) => f.flightNumber === selectedFlight)
    : null;

  const { data: rideRequests = [], isLoading: loadingRequests } = useRideRequests(
    routeId,
    selectedFlightData?.estimatedArrival ?? null
  );

  const joinRide = useJoinRide(routeId);
  const leaveRide = useLeaveRide();

  // Auto-scroll to riders section when flight is selected
  useEffect(() => {
    if (selectedFlight && ridersRef.current) {
      setTimeout(() => {
        ridersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [selectedFlight]);

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

  // Filter flights: search text + for to-airport routes only show future flights
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const filteredFlights = flights
    .filter((f) => {
      const matchesSearch =
        f.flightNumber.toLowerCase().includes(flightSearch.toLowerCase()) ||
        f.origin.toLowerCase().includes(flightSearch.toLowerCase());
      if (!matchesSearch) return false;

      // For to-airport routes, only show future departures
      if (isToAirport) {
        const [h, m] = f.scheduledArrival.split(":").map(Number);
        return h * 60 + m > nowMinutes;
      }

      // For from-airport routes, also only show future arrivals (not yet landed)
      if (f.status === "landed") return false;
      const [h, m] = f.scheduledArrival.split(":").map(Number);
      return h * 60 + m > nowMinutes - 30; // show flights arriving within last 30min too
    })
    .slice(0, 10); // Max 10 flights shown

  // Exclude current user from display count
  const otherRequests = rideRequests.filter((r) => r.user_id !== user?.id);
  const userRequest = rideRequests.find((r) => r.user_id === user?.id);
  const userAlreadyJoined = !!userRequest;
  const userIsInitiator = !!userRequest?.is_initiator;
  const userNumPersons = userRequest?.num_persons || 1;
  const totalPersons = rideRequests.reduce((sum, r) => sum + (r.num_persons || 1), 0) + (userAlreadyJoined ? 0 : numPersons);
  const estimatedTotal = (route.estimatedPrice.min + route.estimatedPrice.max) / 2;
  const rideGroupId = rideRequests.length > 0 ? rideRequests[0].ride_group_id : null;
  const estimatedPerPersonCents = Math.round(getCostPerPerson(estimatedTotal, totalPersons) * numPersons * 100);

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
      numPersons,
    });
  };

  // Labels based on direction
  const flightSectionTitle = isToAirport
    ? "Wann willst du am Flughafen sein?"
    : "Wann kommst du an?";
  const flightSearchPlaceholder = isToAirport
    ? "z.B. LH 2084 oder Abflugzeit"
    : "z.B. LH 2084 oder München";
  const timeLabel = isToAirport ? "Abflug" : "Ankunft";

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
            {flightSectionTitle}
          </h2>

          {isToAirport && (
            <p className="mb-3 text-sm text-muted-foreground">
              Wähle deinen Flug aus, damit wir Mitfahrer mit ähnlicher Abflugzeit finden können.
            </p>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={flightSearchPlaceholder}
              value={flightSearch}
              onChange={(e) => setFlightSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-card py-3 pl-11 pr-4 text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Flight list */}
          <div className="mt-4 space-y-2">
            {loadingFlights ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Flüge werden geladen…</span>
              </div>
            ) : filteredFlights.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Keine Flüge gefunden.</p>
            ) : (
              <>
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
                        {flight.airline} · {isToAirport ? "nach" : "aus"} {flight.origin} ({flight.originCode})
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
                {flights.length > 10 && filteredFlights.length === 10 && !flightSearch && (
                  <p className="text-center text-xs text-muted-foreground">
                    Nutze die Suche um weitere Flüge zu finden
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Matching riders */}
        {selectedFlight && (
          <motion.div
            ref={ridersRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
              <Users className="mb-0.5 mr-2 inline-block h-5 w-5 text-primary" />
              Mitfahrer in deinem Zeitfenster
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Personen die ±60 Minuten um {selectedFlightData?.estimatedArrival} Uhr {isToAirport ? "abfliegen" : "ankommen"}
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
                        {/* Anonymized: show only first name initial */}
                        {req.profile?.full_name
                          ? `${req.profile.full_name.split(" ")[0].charAt(0)}. (Mitfahrer)`
                          : "Mitfahrer"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {timeLabel} {req.estimated_arrival}
                        {(req.num_persons || 1) > 1 && ` · ${req.num_persons} Personen`}
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
                    Geschätzte Kosten pro Person ({totalPersons} Personen, inkl. 10% Gebühr)
                  </p>
                  <p className="font-display text-3xl font-bold text-secondary-foreground">
                    {getCostPerPerson(estimatedTotal, totalPersons)} €
                  </p>
                </div>

                {!userAlreadyJoined && (
                  <div className="space-y-3">
                    {/* Personenanzahl */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                      <span className="text-sm font-medium text-card-foreground">
                        <Users className="mb-0.5 mr-1.5 inline-block h-4 w-4 text-primary" />
                        Für wie viele Personen?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNumPersons(Math.max(1, numPersons - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-card-foreground transition-colors hover:bg-muted"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-display font-semibold text-card-foreground">{numPersons}</span>
                        <button
                          type="button"
                          onClick={() => setNumPersons(Math.min(4, numPersons + 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-card-foreground transition-colors hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {numPersons > 1 && (
                      <p className="text-center text-xs text-muted-foreground">
                        Du zahlst für {numPersons} Personen: ca. {getCostPerPerson(estimatedTotal, totalPersons) * numPersons} €
                      </p>
                    )}
                    <button
                      onClick={handleJoin}
                      disabled={joinRide.isPending}
                      className="w-full rounded-lg bg-primary py-3 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      {joinRide.isPending ? (
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      ) : user ? (
                        `Jetzt beitreten & Taxi teilen${numPersons > 1 ? ` (${numPersons} Pers.)` : ""}`
                      ) : (
                        "Anmelden & beitreten"
                      )}
                    </button>
                  </div>
                )}

                {userAlreadyJoined && (
                  <UserJoinedSection
                    rideGroupId={rideGroupId}
                    rideRequestId={userRequest?.id ?? null}
                    routeFrom={route.from}
                    routeTo={route.to}
                    userIsInitiator={userIsInitiator}
                    estimatedPerPersonCents={estimatedPerPersonCents}
                    userNumPersons={userNumPersons}
                    userId={user?.id}
                  />
                )}

                {/* Initiator can finalize the ride */}
                {userIsInitiator && rideGroupId && (
                  <FinalizeRide
                    rideGroupId={rideGroupId}
                    numRiders={rideRequests.reduce((sum, r) => sum + (r.num_persons || 1), 0)}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                {userAlreadyJoined ? (
                  <>
                    <p className="mb-1 font-medium text-card-foreground">Du bist eingetragen!</p>
                    <p className="text-sm text-muted-foreground">
                      Sobald andere mit ähnlicher {isToAirport ? "Abflugzeit" : "Ankunftszeit"} dazukommen, siehst du sie hier.
                    </p>
                    <p className="mt-3 text-sm font-medium text-primary">
                      ✓ Du bist bereits eingetragen
                    </p>
                    {userRequest && (
                      <button
                        onClick={() => {
                          if (confirm("Möchtest du dich wirklich austragen?")) {
                            leaveRide.mutate(userRequest.id);
                          }
                        }}
                        disabled={leaveRide.isPending}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm text-destructive hover:underline disabled:opacity-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {leaveRide.isPending ? "Wird ausgetragen…" : "Austragen"}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-1 font-medium text-card-foreground">Noch keine Mitfahrer in deinem Zeitfenster</p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Sei der Erste! Trage dich ein und andere mit ähnlicher {isToAirport ? "Abflugzeit" : "Ankunftszeit"} werden dich finden.
                    </p>
                    <button
                      onClick={handleJoin}
                      disabled={joinRide.isPending}
                      className="rounded-lg bg-primary px-8 py-3 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      {joinRide.isPending ? (
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      ) : user ? (
                        "Als Erster eintragen"
                      ) : (
                        "Anmelden & als Erster eintragen"
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
