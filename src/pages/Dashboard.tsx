import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Car,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  Mail,
  Phone,
  ArrowRight,
  Timer,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useMyRides } from "@/hooks/use-profile";
import { ROUTES } from "@/lib/data";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const statusLabels: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  open: { label: "Offen", icon: Clock, className: "text-primary bg-primary/10" },
  completed: { label: "Abgeschlossen", icon: CheckCircle, className: "text-taxi-success bg-taxi-success/10" },
  cancelled: { label: "Storniert", icon: AlertCircle, className: "text-destructive bg-destructive/10" },
};

const paymentLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "Ausstehend", className: "text-primary bg-primary/10" },
  authorized: { label: "Reserviert", className: "text-taxi-info bg-taxi-info/10" },
  captured: { label: "Abgebucht", className: "text-taxi-success bg-taxi-success/10" },
  failed: { label: "Fehlgeschlagen", className: "text-destructive bg-destructive/10" },
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading: loadingProfile } = useProfile();
  const { data: rides = [], isLoading: loadingRides } = useMyRides();

  if (!user) {
    navigate("/auth");
    return null;
  }

  const activeRides = rides.filter((r) => r.group?.status === "open");
  const pastRides = rides.filter((r) => r.group?.status !== "open");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="container mx-auto max-w-3xl flex-1 px-4 py-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-border bg-card p-6 taxi-shadow-card"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-card-foreground">
                  {profile?.full_name || user.email?.split("@")[0] || "Nutzer"}
                </h1>
                <div className="mt-1 space-y-0.5">
                  {user.email && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {user.email}
                    </p>
                  )}
                  {profile?.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {profile.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </div>

          {/* Stripe Connect Status */}
          {profile?.stripe_connect_onboarding_complete ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-taxi-success/10 px-4 py-2.5 text-sm font-medium text-taxi-success">
              <CheckCircle className="h-4 w-4" />
              Zahlungsempfang eingerichtet
            </div>
          ) : (
            <Link
              to="/stripe-onboarding"
              className="mt-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Zahlungsempfang einrichten (um als Initiator Geld zu erhalten)
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </motion.div>

        {/* Active Rides */}
        <section className="mb-8">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            <Car className="mb-0.5 mr-2 inline-block h-5 w-5 text-primary" />
            Aktive Fahrten
          </h2>
          {loadingRides ? (
            <p className="text-sm text-muted-foreground">Laden…</p>
          ) : activeRides.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
              <Car className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Keine aktiven Fahrten.</p>
              <Link to="/" className="mt-2 inline-block text-sm font-medium text-primary underline">
                Jetzt Taxi teilen →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          )}
        </section>

        {/* Past Rides */}
        {pastRides.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
              <Clock className="mb-0.5 mr-2 inline-block h-5 w-5 text-muted-foreground" />
              Vergangene Fahrten
            </h2>
            <div className="space-y-3">
              {pastRides.map((ride) => (
                <RideCard key={ride.id} ride={ride} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
};

function getPaymentDaysLeft(createdAt: string): number {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function RideCard({ ride }: { ride: any }) {
  const route = ROUTES.find((r) => r.id === ride.route_id);
  const status = statusLabels[ride.group?.status || "open"];
  const payment = ride.payment ? paymentLabels[ride.payment.status] || null : null;
  const StatusIcon = status.icon;

  const showExpiry = ride.payment && (ride.payment.status === "authorized" || ride.payment.status === "pending");
  const daysLeft = showExpiry ? getPaymentDaysLeft(ride.payment.created_at) : null;

  return (
    <Link
      to={`/route/${ride.route_id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 taxi-shadow-card"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-semibold text-card-foreground">
            {route ? `${route.from} → ${route.to}` : ride.route_id}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {ride.estimated_arrival} Uhr
            {ride.flight_number && ` · Flug ${ride.flight_number}`}
            {ride.num_persons > 1 && ` · ${ride.num_persons} Personen`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(ride.created_at).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
          {payment && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${payment.className}`}>
              <CreditCard className="h-3 w-3" />
              {payment.label}
              {ride.payment?.amount_captured && ` · ${(ride.payment.amount_captured / 100).toFixed(2)} €`}
            </span>
          )}
          {showExpiry && daysLeft !== null && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              daysLeft === 0
                ? "bg-destructive/10 text-destructive"
                : daysLeft <= 2
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
            }`}>
              <Timer className="h-3 w-3" />
              {daysLeft === 0 ? "Abgelaufen" : `${daysLeft}d übrig`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default Dashboard;
