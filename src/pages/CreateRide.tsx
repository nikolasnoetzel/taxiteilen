// "Fahrt anbieten" — the explicit ride-creation flow (v1 had none).
// Route & direction → date/time/seats → meeting point → price preview →
// Connect onboarding gate → publish.
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeftRight, CreditCard, Info, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RoutePath } from "@/components/RoutePath";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useRoutes } from "@/hooks/use-routes";
import { directionalRoutes } from "@/lib/directions";
import { api } from "@/lib/api";
import { seatPriceCents, formatEuro } from "@/lib/pricing";
import { berlinToIso } from "@/lib/format";

const CreateRide = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const { data: routes } = useRoutes();
  const options = useMemo(() => directionalRoutes(routes ?? []), [routes]);

  const presetKey =
    params.get("route") && params.get("richtung")
      ? `${params.get("route")}:${params.get("richtung")}`
      : "";
  const [selectedKey, setSelectedKey] = useState(presetKey);
  const [date, setDate] = useState(params.get("datum") ?? "");
  const [time, setTime] = useState("08:00");
  const [seats, setSeats] = useState(4);
  const [persons, setPersons] = useState(1);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = options.find((o) => o.key === selectedKey) ?? null;
  const seatPrice = selected ? seatPriceCents(selected.route.fixed_price_cents, seats) : 0;

  const { data: connect, isLoading: connectLoading } = useQuery({
    queryKey: ["connect-status", user?.id],
    enabled: Boolean(user),
    queryFn: api.connectStatus,
  });

  const swap = () => {
    if (!selected) return;
    const reversed = options.find((o) => o.from === selected.to && o.to === selected.from);
    if (reversed) setSelectedKey(reversed.key);
  };

  const submit = async () => {
    if (!selected || !date || !time) {
      toast.error("Bitte Strecke, Datum und Uhrzeit wählen.");
      return;
    }
    setSubmitting(true);
    try {
      const { ride_group_id } = await api.createRide({
        route_id: selected.route.id,
        direction: selected.direction,
        departure_at: berlinToIso(date, time),
        meeting_point: meetingPoint || undefined,
        seats_total: seats,
        num_persons: persons,
      });
      toast.success("Deine Fahrt ist online!");
      navigate(`/fahrt/${ride_group_id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const startOnboarding = async () => {
    try {
      const res = await api.connectOnboarding();
      if (res.url) window.location.href = res.url;
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const labelCls = "text-sm font-semibold";
  const cardCls = "rounded-2xl border border-border/70 bg-card p-6 shadow-lift space-y-5";

  const Stepper = ({
    value, setValue, min, max,
  }: { value: number; setValue: (n: number) => void; min: number; max: number }) => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-foreground transition-colors disabled:opacity-40"
        onClick={() => setValue(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center font-display text-lg font-bold">{value}</span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-foreground transition-colors disabled:opacity-40"
        onClick={() => setValue(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="container max-w-2xl py-10 md:py-14">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold md:text-4xl">Fahrt anbieten</h1>
            <p className="mt-2 text-muted-foreground">
              Du legst die Fahrt an, bestellst das Taxi und zahlst den Fahrer —
              die Anteile deiner Mitfahrer bekommst du automatisch ausgezahlt.
            </p>
          </motion.div>

          {!authLoading && !user ? (
            <div className={`${cardCls} mt-8 text-center`}>
              <p className="text-sm text-muted-foreground">
                Melde dich an, um eine Fahrt anzubieten.
              </p>
              <Button asChild>
                <Link to={`/auth?redirect=${encodeURIComponent("/fahrt-erstellen")}`}>Anmelden</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {/* Strecke */}
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <p className={labelCls}>Strecke</p>
                  <button
                    type="button"
                    onClick={swap}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeftRight className="h-3 w-3" /> Richtung tauschen
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setSelectedKey(o.key)}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        o.key === selectedKey
                          ? "border-foreground bg-foreground/[0.03] ring-1 ring-foreground"
                          : "border-border hover:border-foreground/40"
                      }`}
                    >
                      <RoutePath from={o.from} to={o.to} compact className="[&_span]:!text-sm" />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Festpreis {formatEuro(o.route.fixed_price_cents)} · ~{o.route.duration_min} Min
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zeit & Plätze */}
              <div className={cardCls}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className={labelCls}>Datum</p>
                    <Input
                      type="date"
                      value={date}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className={labelCls}>Abfahrt</p>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className={labelCls}>Plätze im Taxi</p>
                    <p className="text-xs text-muted-foreground">Inklusive dir (Standard-Taxi: 4)</p>
                  </div>
                  <Stepper value={seats} setValue={(n) => { setSeats(n); setPersons(Math.min(persons, n - 1)); }} min={2} max={8} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className={labelCls}>Davon reist du mit</p>
                    <p className="text-xs text-muted-foreground">Du + Begleitung</p>
                  </div>
                  <Stepper value={persons} setValue={setPersons} min={1} max={seats - 1} />
                </div>
                <div className="space-y-1.5">
                  <p className={labelCls}>Treffpunkt (optional)</p>
                  <Input
                    placeholder="z. B. Hauptbahnhof, Ausgang Kiellinie"
                    value={meetingPoint}
                    maxLength={200}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                  />
                </div>
              </div>

              {/* Preis-Preview */}
              {selected && (
                <div className={cardCls}>
                  <p className={labelCls}>So teilt sich der Preis</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Festpreis {selected.from} → {selected.to}</span>
                      <span>{formatEuro(selected.route.fixed_price_cents)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Anteil pro Platz ({seats} Plätze)</span>
                      <span>{formatEuro(seatPrice)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-semibold">
                      <span>Du erhältst pro Mitfahrer-Platz</span>
                      <span className="text-success">{formatEuro(seatPrice)}</span>
                    </div>
                    <div className="flex justify-between font-display font-bold">
                      <span>Voll besetzt zahlst du effektiv</span>
                      <span>{formatEuro(selected.route.fixed_price_cents - seatPrice * (seats - persons))}</span>
                    </div>
                  </div>
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Mitfahrer zahlen ihren Anteil + 20 % Servicegebühr. Die Auszahlung
                    an dich erfolgt automatisch 48 Stunden nach der Fahrt. Du zahlst
                    den Taxifahrer direkt.
                  </p>
                </div>
              )}

              {/* Connect gate + submit */}
              {user && !connectLoading && !connect?.onboarded ? (
                <div className={`${cardCls} border-accent bg-accent/10`}>
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">Zahlungsempfang einrichten</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Damit wir dir die Anteile deiner Mitfahrer auszahlen können,
                        verbinde einmalig dein Bankkonto (über Stripe, dauert ~2 Minuten).
                      </p>
                      <Button className="mt-4" onClick={startOnboarding}>
                        Jetzt einrichten
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button size="lg" className="w-full" onClick={submit} disabled={submitting || !selected || !date}>
                  {submitting ? <Loader2 className="animate-spin" /> : null}
                  Fahrt veröffentlichen
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateRide;
