// Admin-Arbeitsplatz: offene Disputes sichten und entscheiden (P7/P8).
// Zugriff nur mit profiles.is_admin — serverseitig erzwingen die Edge
// Functions das ohnehin, die Seite ist nur die Bedienoberfläche.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldX } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { api, type AdminDispute } from "@/lib/api";
import { formatEuro, formatDepartureLong } from "@/lib/format";

const RESOLUTIONS = [
  {
    key: "resolved_payout" as const,
    label: "Auszahlung freigeben",
    icon: CheckCircle2,
    hint: "Meldung unbegründet — cron-payout läuft normal weiter.",
  },
  {
    key: "resolved_refund" as const,
    label: "Melder erstatten",
    icon: RotateCcw,
    hint: "Nur die Zahlung des Melders wird zurückerstattet.",
  },
  {
    key: "resolved_dissolve" as const,
    label: "Fahrt auflösen",
    icon: ShieldX,
    hint: "P7: ALLE Zahlungen der Gruppe werden erstattet, die Fahrt wird storniert.",
  },
];

const DisputeCard = ({ item, onDone }: { item: AdminDispute; onDone: () => void }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [strikeInitiator, setStrikeInitiator] = useState(false);

  const resolve = async (resolution: (typeof RESOLUTIONS)[number]["key"]) => {
    setBusy(resolution);
    try {
      await api.resolveDispute({
        dispute_id: item.dispute.id,
        resolution,
        strike_initiator: resolution === "resolved_dissolve" ? strikeInitiator : undefined,
      });
      toast.success("Fall entschieden.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setBusy(null);
    }
  };

  const paidTotal = item.payments
    .filter((p) => ["paid", "retained"].includes(p.status))
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-display text-lg">{item.routeName}</CardTitle>
          <span className="text-xs text-muted-foreground">
            gemeldet am {formatDepartureLong(item.dispute.created_at)}
          </span>
        </div>
        {item.group && (
          <p className="text-sm text-muted-foreground">
            Abfahrt {formatDepartureLong(item.group.departure_at)} · Gruppenstatus „{item.group.status}"
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <p className="mb-1 font-medium text-foreground">
            {item.reporter?.name ?? "Unbekannt"}
            {item.reporter?.is_initiator ? " (Initiator)" : " (Mitfahrer)"}
            {item.reporter?.email ? ` · ${item.reporter.email}` : ""}
          </p>
          <p className="text-muted-foreground">„{item.dispute.reason}"</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Eingefrorenes Geld:{" "}
          <strong className="text-foreground">{formatEuro(paidTotal)}</strong>{" "}
          aus {item.payments.filter((p) => ["paid", "retained"].includes(p.status)).length} Zahlung(en)
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {RESOLUTIONS.map(({ key, label, icon: Icon, hint }) => (
            <Button
              key={key}
              variant={key === "resolved_payout" ? "default" : "outline"}
              size="sm"
              disabled={busy !== null}
              onClick={() => resolve(key)}
              title={hint}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {busy === key ? "Wird ausgeführt…" : label}
            </Button>
          ))}
          <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={strikeInitiator}
              onCheckedChange={(v) => setStrikeInitiator(v === true)}
            />
            Beim Auflösen: Strike für den Initiator (No-Show)
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

const Admin = () => {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
    if (!profileLoading && profile && !profile.is_admin) navigate("/", { replace: true });
  }, [loading, user, profileLoading, profile, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-disputes"],
    enabled: Boolean(profile?.is_admin),
    queryFn: () => api.adminListDisputes(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
  const disputes = data?.disputes ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container flex-1 px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-2xl font-bold">Offene Fälle</h1>
            <p className="text-sm text-muted-foreground">
              Jeder offene Fall pausiert die Auszahlung seiner ganzen Gruppe.
            </p>
          </div>
        </div>

        {isLoading || profileLoading ? (
          <p className="py-12 text-center text-muted-foreground">Fälle werden geladen…</p>
        ) : error ? (
          <p className="py-12 text-center text-destructive">
            {error instanceof Error ? error.message : "Fälle konnten nicht geladen werden."}
          </p>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
            <p className="font-medium text-foreground">Keine offenen Fälle.</p>
            <p className="text-sm text-muted-foreground">Alle Auszahlungen laufen automatisch.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {disputes.map((item) => (
              <DisputeCard key={item.dispute.id} item={item} onDone={refresh} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
