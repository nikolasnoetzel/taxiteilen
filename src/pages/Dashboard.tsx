import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CreditCard, Crown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RoutePath } from "@/components/RoutePath";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { useMyRides, type MyRide } from "@/hooks/use-rides";
import { useRoutes } from "@/hooks/use-routes";
import { api } from "@/lib/api";
import { formatDepartureShort, formatEuro } from "@/lib/format";

const membershipLabel: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Zahlung ausstehend", cls: "bg-accent text-accent-foreground" },
  active: { label: "Dabei", cls: "bg-success text-success-foreground" },
  cancelled_free: { label: "Storniert (erstattet)", cls: "bg-muted text-muted-foreground" },
  cancelled_late: { label: "Storniert (einbehalten)", cls: "bg-muted text-muted-foreground" },
  no_show: { label: "Nicht erschienen", cls: "bg-destructive text-destructive-foreground" },
  expired: { label: "Abgelaufen", cls: "bg-muted text-muted-foreground" },
};

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: rides, isLoading } = useMyRides();
  const { data: routes } = useRoutes();
  const routeMap = new Map((routes ?? []).map((r) => [r.id, r]));

  const { data: connect } = useQuery({
    queryKey: ["connect-status", user?.id],
    enabled: Boolean(user),
    queryFn: api.connectStatus,
  });

  if (!loading && !user) {
    navigate("/auth?redirect=/dashboard");
    return null;
  }

  const startOnboarding = async () => {
    try {
      const res = await api.connectOnboarding();
      if (res.url) window.location.href = res.url;
      else toast.success("Zahlungsempfang ist bereits eingerichtet.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const now = Date.now();
  const upcoming = (rides ?? []).filter(
    (r) => new Date(r.group.departure_at).getTime() >= now &&
      !["cancelled"].includes(r.group.status) &&
      ["pending_payment", "active"].includes(r.membership.status)
  );
  const past = (rides ?? []).filter((r) => !upcoming.includes(r));

  const RideRow = ({ ride }: { ride: MyRide }) => {
    const route = routeMap.get(ride.group.route_id);
    if (!route) return null;
    const from = ride.group.direction === "to_hub" ? route.city.name : route.hub.name;
    const to = ride.group.direction === "to_hub" ? route.hub.name : route.city.name;
    const isInitiator = ride.membership.role === "initiator";
    const badge =
      ride.group.status === "cancelled"
        ? { label: "Fahrt abgesagt", cls: "bg-muted text-muted-foreground" }
        : membershipLabel[ride.membership.status] ?? membershipLabel.active;

    return (
      <Link
        to={`/fahrt/${ride.group.id}`}
        className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-lift-lg"
      >
        <div className="min-w-0 flex-1">
          <RoutePath from={from} to={to} compact className="[&_span]:!text-[15px]" />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">
              {formatDepartureShort(ride.group.departure_at)}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 font-bold ${badge.cls}`}>{badge.label}</span>
            {isInitiator && (
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-bold">
                <Crown className="h-3 w-3" /> Initiator
              </span>
            )}
            {ride.payment && ["paid", "retained", "transferred"].includes(ride.payment.status) && !isInitiator && (
              <span className="text-muted-foreground">{formatEuro(ride.payment.amount_cents)} gezahlt</span>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="container max-w-3xl py-10 md:py-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold md:text-4xl">
              Moin{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="mt-2 text-muted-foreground">Deine Fahrten und Einstellungen.</p>
          </motion.div>

          {/* Connect status */}
          <div className="mt-8 rounded-2xl border border-border/70 bg-card p-5 shadow-lift">
            {connect?.onboarded ? (
              <p className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>
                  <strong>Zahlungsempfang aktiv.</strong>{" "}
                  <span className="text-muted-foreground">Auszahlungen laufen automatisch auf dein Konto.</span>
                </span>
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2.5 text-sm">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span>
                    <strong>Zahlungsempfang einrichten,</strong>{" "}
                    <span className="text-muted-foreground">um Fahrten anbieten zu können.</span>
                  </span>
                </p>
                <Button size="sm" onClick={startOnboarding}>Einrichten</Button>
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Kommende Fahrten</h2>
              <Button size="sm" variant="outline" asChild>
                <Link to="/fahrt-erstellen"><Plus /> Neue Fahrt</Link>
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Laden …
              </div>
            ) : upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Keine kommenden Fahrten.{" "}
                  <Link to="/suche" className="font-semibold text-foreground underline underline-offset-4">
                    Jetzt eine finden
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((r) => <RideRow key={r.membership.id} ride={r} />)}
              </div>
            )}
          </div>

          {/* Past */}
          {past.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 font-display text-xl font-bold">Vergangene & stornierte Fahrten</h2>
              <div className="space-y-3 opacity-80">
                {past.slice(0, 10).map((r) => <RideRow key={r.membership.id} ride={r} />)}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
