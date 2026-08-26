// Trip page: join & pay, participants, chat, taxi companies, cancellation,
// no-show marking and dispute reporting — the heart of the product.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, CalendarDays, Clock, Crown, Loader2,
  MapPin, Minus, PhoneCall, Plus, ShieldCheck, Users, UserX,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GroupChat from "@/components/GroupChat";
import { RoutePath } from "@/components/RoutePath";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { PolicyNote } from "@/components/PolicyNote";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useRideDetail } from "@/hooks/use-rides";
import { useRoutes, useRouteTaxiCompanies } from "@/hooks/use-routes";
import { api } from "@/lib/api";
import { formatDate, formatDepartureLong, formatEuro, formatPhoneHref, formatTime, hoursUntil } from "@/lib/format";

const statusBadge: Record<string, { label: string; cls: string }> = {
  open: { label: "Offen", cls: "bg-accent text-accent-foreground" },
  locked: { label: "Fahrt ist fix", cls: "bg-foreground text-background" },
  initiator_needed: { label: "Initiator gesucht", cls: "bg-destructive text-destructive-foreground" },
  completed: { label: "Abgeschlossen", cls: "bg-success text-success-foreground" },
  cancelled: { label: "Abgesagt", cls: "bg-muted text-muted-foreground" },
};

const RideDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: detail, isLoading } = useRideDetail(id);
  const { data: routes } = useRoutes();
  const route = useMemo(
    () => routes?.find((r) => r.id === detail?.group.route_id),
    [routes, detail]
  );
  const { data: taxiCompanies } = useRouteTaxiCompanies(route?.id);

  const [persons, setPersons] = useState(1);
  const [busy, setBusy] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  // Checkout redirect feedback
  useEffect(() => {
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success("Zahlung erfolgreich — du bist dabei! Bestätigung kommt per E-Mail.");
      queryClient.invalidateQueries({ queryKey: ["ride-detail", id] });
    } else if (payment === "cancelled") {
      toast.info("Zahlung abgebrochen. Dein Platz bleibt noch kurze Zeit reserviert — du kannst die Zahlung direkt erneut starten.");
    }
    if (payment) {
      params.delete("payment");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || !routes) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Fahrt wird geladen …
        </div>
      </div>
    );
  }

  if (!detail || !route) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">Diese Fahrt existiert nicht (mehr).</p>
          <Button asChild><Link to="/suche">Zur Suche</Link></Button>
        </div>
        <Footer />
      </div>
    );
  }

  const { group, members, seatsTaken, myMembership, myPayment } = detail;
  const from = group.direction === "to_hub" ? route.city.name : route.hub.name;
  const to = group.direction === "to_hub" ? route.hub.name : route.city.name;
  const seatsLeft = Math.max(group.seats_total - seatsTaken, 0);
  const badge = statusBadge[group.status] ?? statusBadge.open;

  const isInitiator = user?.id === group.initiator_id;
  const isActiveMember = Boolean(myMembership && ["active", "pending_payment"].includes(myMembership.status));
  const departed = new Date(group.departure_at).getTime() < Date.now();
  const joinable =
    !departed && ["open", "locked"].includes(group.status) && seatsLeft > 0 && !isActiveMember && hoursUntil(group.departure_at) > 1;

  const run = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      queryClient.invalidateQueries({ queryKey: ["ride-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const join = () =>
    run(async () => {
      const { url } = await api.joinRide(group.id, persons);
      window.location.href = url;
    });

  const card = "rounded-2xl border border-border/70 bg-card p-6 shadow-lift";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="container max-w-5xl py-8 md:py-12">
          <Link to="/suche" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Alle Fahrten
          </Link>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`${card} md:p-8`}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>{badge.label}</span>
              {isInitiator && (
                <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                  <Crown className="h-3 w-3" /> Deine Fahrt
                </span>
              )}
            </div>
            <RoutePath from={from} to={to} />
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDate(group.departure_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatTime(group.departure_at)} Uhr · ~{route.duration_min} Min
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {seatsTaken}/{group.seats_total} Plätze belegt
              </span>
              {group.meeting_point && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {group.meeting_point}
                </span>
              )}
            </div>
          </motion.div>

          {/* Takeover banner */}
          {group.status === "initiator_needed" && (
            <div className={`${card} mt-5 border-destructive/40 bg-destructive/5`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="font-semibold">Der Initiator hat abgesagt — die Fahrt braucht dich.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Übernimm die Fahrt: Du bestellst das Taxi, zahlst den Fahrer und
                    erhältst die Anteile aller Mitfahrer. Dein eigener Beitrag wird
                    dir zurückerstattet. Übernimmt niemand
                    {group.takeover_deadline ? ` bis ${formatTime(group.takeover_deadline)} Uhr` : ""}, wird die
                    Fahrt aufgelöst und alle erhalten ihr Geld zurück.
                  </p>
                  {myMembership?.status === "active" && myMembership.role === "rider" && (
                    <Button
                      className="mt-3"
                      disabled={busy}
                      onClick={() => run(() => api.takeoverInitiator(group.id), "Du bist jetzt Initiator dieser Fahrt!")}
                    >
                      Fahrt übernehmen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
            {/* Left column */}
            <div className="space-y-5">
              {/* Participants */}
              <div className={card}>
                <h2 className="mb-4 font-display text-lg font-bold">Mitfahrende</h2>
                <ul className="space-y-3">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold">
                        {(m.profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {m.profile?.full_name ?? "Mitfahrer:in"}
                          {m.user_id === user?.id && " (du)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.role === "initiator" ? "Initiator · bestellt das Taxi" : `${m.num_persons} ${m.num_persons === 1 ? "Person" : "Personen"}`}
                          {m.status === "pending_payment" && " · Zahlung ausstehend"}
                        </p>
                      </div>
                      {m.role === "initiator" && <Crown className="h-4 w-4 text-accent-foreground/60" />}
                      {isInitiator && departed && m.role === "rider" && m.status === "active" &&
                        new Date(group.payout_due_at).getTime() > Date.now() && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <UserX /> Nicht erschienen
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Als „nicht erschienen" markieren?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Der Beitrag von {m.profile?.full_name ?? "dieser Person"} wird einbehalten
                                und dir ausgezahlt. Die Person wird informiert und kann widersprechen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction onClick={() => run(() => api.markNoShow(group.id, m.user_id), "No-Show vermerkt.")}>
                                Markieren
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </li>
                  ))}
                  {seatsLeft > 0 && (
                    <li className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border">
                        <Plus className="h-4 w-4" />
                      </span>
                      <p className="text-sm">
                        {seatsLeft} {seatsLeft === 1 ? "freier Platz" : "freie Plätze"}
                      </p>
                    </li>
                  )}
                </ul>
              </div>

              {/* Taxi companies (visible to members; the initiator orders) */}
              {isActiveMember && (taxiCompanies?.length ?? 0) > 0 && (
                <div className={card}>
                  <h2 className="mb-1 font-display text-lg font-bold">Taxi bestellen</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {isInitiator
                      ? "Ruf am besten 1–2 Tage vorher an und nenne Abfahrtszeit und Treffpunkt."
                      : "Diese Zentralen empfehlen wir — der Initiator übernimmt die Bestellung."}
                  </p>
                  <ul className="space-y-3">
                    {taxiCompanies!.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{c.name}</p>
                          {c.description && <p className="truncate text-xs text-muted-foreground">{c.description}</p>}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={formatPhoneHref(c.phone)}>
                            <PhoneCall /> {c.phone}
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Chat */}
              {isActiveMember && myMembership?.status === "active" && (
                <GroupChat rideGroupId={group.id} routeName={`${from} → ${to}`} />
              )}
            </div>

            {/* Right column: join / my status */}
            <div className="space-y-5">
              {joinable && (
                <div className={`${card} lg:sticky lg:top-20`}>
                  <h2 className="mb-4 font-display text-lg font-bold">Mitfahren</h2>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Personen</p>
                      <p className="text-xs text-muted-foreground">max. {seatsLeft} frei</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-foreground transition-colors disabled:opacity-40"
                        onClick={() => setPersons(Math.max(1, persons - 1))}
                        disabled={persons <= 1}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-display text-lg font-bold">{persons}</span>
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-foreground transition-colors disabled:opacity-40"
                        onClick={() => setPersons(Math.min(seatsLeft, persons + 1))}
                        disabled={persons >= seatsLeft}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <PriceBreakdown seatPriceCents={group.seat_price_cents} numPersons={persons} />
                  <Button size="lg" className="mt-5 w-full" onClick={join} disabled={busy || !user}>
                    {busy ? <Loader2 className="animate-spin" /> : null}
                    Platz sichern & bezahlen
                  </Button>
                  {!user && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      <Link to={`/auth?redirect=${encodeURIComponent(`/fahrt/${group.id}`)}`} className="font-semibold underline underline-offset-2">
                        Anmelden
                      </Link>{" "}
                      um mitzufahren
                    </p>
                  )}
                  <div className="mt-4">
                    <PolicyNote departureAt={group.departure_at} />
                  </div>
                </div>
              )}

              {/* My booking status */}
              {isActiveMember && !isInitiator && (
                <div className={card}>
                  <h2 className="mb-3 font-display text-lg font-bold">Deine Buchung</h2>
                  {myPayment?.status === "paid" || myPayment?.status === "transferred" ? (
                    <p className="flex items-center gap-2 text-sm text-success">
                      <ShieldCheck className="h-4 w-4" /> Bezahlt — {formatEuro(myPayment.amount_cents)}
                    </p>
                  ) : myMembership?.status === "pending_payment" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Deine Zahlung steht noch aus.</p>
                      <Button className="w-full" onClick={join} disabled={busy}>Jetzt bezahlen</Button>
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-3">
                    <PolicyNote departureAt={group.departure_at} />
                    {!departed && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full" disabled={busy}>Stornieren</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Wirklich stornieren?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {hoursUntil(group.departure_at) >= 24
                                ? "Du bekommst den vollen Betrag zurückerstattet."
                                : "Achtung: Weniger als 24 Stunden bis zur Abfahrt — der Betrag wird einbehalten und geht an den Initiator."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Zurück</AlertDialogCancel>
                            <AlertDialogAction onClick={() => run(() => api.cancelMembership(group.id), "Storniert.")}>
                              Stornieren
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              )}

              {/* Initiator controls */}
              {isInitiator && ["open", "locked"].includes(group.status) && !departed && (
                <div className={card}>
                  <h2 className="mb-3 font-display text-lg font-bold">Fahrt verwalten</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Nach der Fahrt erhältst du automatisch{" "}
                    <strong className="text-foreground">
                      {formatEuro(group.seat_price_cents * Math.max(seatsTaken - (myMembership?.num_persons ?? 1), 0))}
                    </strong>{" "}
                    (aktueller Stand) — 48 h nach Abfahrt.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full text-destructive" disabled={busy}>
                        Fahrt absagen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Fahrt wirklich absagen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {hoursUntil(group.departure_at) >= 24
                            ? "Deine Mitfahrer erhalten die Chance, die Fahrt zu übernehmen — sonst wird sie aufgelöst und alle bekommen ihr Geld zurück."
                            : "Weniger als 24 Stunden vor Abfahrt: Alle Mitfahrer werden voll erstattet und du erhältst einen Strike (3 Strikes = Konto gesperrt)."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Zurück</AlertDialogCancel>
                        <AlertDialogAction onClick={() => run(() => api.cancelRide(group.id), "Fahrt abgesagt.")}>
                          Absagen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* Dispute */}
              {myMembership && departed && group.status !== "completed" && (
                <div className={card}>
                  <h2 className="mb-2 font-display text-lg font-bold">Gab es ein Problem?</h2>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Fahrt nicht stattgefunden oder zu Unrecht als No-Show markiert?
                    Melde es innerhalb von 48 h nach Abfahrt — die Auszahlung wird pausiert.
                  </p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">Problem melden</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Problem melden</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        placeholder="Was ist passiert?"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        rows={4}
                      />
                      <Button
                        disabled={busy || disputeReason.trim().length < 10}
                        onClick={() => run(() => api.openDispute(group.id, disputeReason), "Gemeldet — wir prüfen den Fall.")}
                      >
                        Absenden
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RideDetail;
