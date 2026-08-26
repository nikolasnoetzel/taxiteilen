import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, HandCoins, PhoneCall, ShieldCheck, Sparkles, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SearchBar } from "@/components/SearchBar";
import { RoutePath } from "@/components/RoutePath";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRoutes } from "@/hooks/use-routes";
import { directionalRoutes } from "@/lib/directions";
import { seatPriceCents, riderCharge, formatEuro } from "@/lib/pricing";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.21, 0.65, 0.36, 1] as const },
};

const Index = () => {
  const { data: routes } = useRoutes();
  const options = directionalRoutes(routes ?? []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ---------------- Hero ---------------- */}
      <header className="relative overflow-hidden">
        {/* Route-line backdrop */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-10 mx-auto w-[1400px] max-w-none opacity-[0.07]"
          viewBox="0 0 1400 500"
          fill="none"
          aria-hidden
        >
          <path
            d="M-50 420 C 250 420, 350 80, 700 80 S 1150 420, 1450 420"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray="1 14"
            strokeLinecap="round"
          />
          <circle cx="700" cy="80" r="7" fill="currentColor" />
        </svg>

        <div className="container relative pt-16 pb-14 md:pt-28 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.21, 0.65, 0.36, 1] }}
            className="max-w-3xl"
          >
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] font-semibold shadow-lift">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Flughafentransfer, geteilt statt teuer
            </p>
            <h1 className="text-[2.75rem] leading-[1.04] font-extrabold md:text-7xl">
              Ein Taxi. <br className="hidden md:block" />
              Geteilt ist es <span className="serif-accent">fair</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              Finde Menschen auf deiner Strecke zum Flughafen, teilt euch den
              Festpreis — bis zu 75&nbsp;% günstiger als allein. Bezahlung und
              Absicherung übernehmen wir.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.65, ease: [0.21, 0.65, 0.36, 1] }}
            className="mt-10 max-w-4xl"
          >
            <SearchBar />
            <p className="mt-4 text-sm text-muted-foreground">
              Oder{" "}
              <Link to="/fahrt-erstellen" className="font-semibold text-foreground underline underline-offset-4 hover:no-underline">
                biete selbst eine Fahrt an
              </Link>{" "}
              und lass andere deine Kosten senken.
            </p>
          </motion.div>
        </div>
      </header>

      {/* ---------------- Popular routes ---------------- */}
      <section id="strecken" className="border-t border-border bg-card/50">
        <div className="container py-16 md:py-24">
          <motion.div {...fadeUp} className="mb-10 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">Beliebte Strecken</h2>
              <p className="mt-2 text-muted-foreground">
                Feste Preise, transparent geteilt. Preis pro Person bei voll besetztem Taxi (4 Plätze).
              </p>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {options.map((o, i) => {
              const perPerson = riderCharge(seatPriceCents(o.route.fixed_price_cents, 4), 1).amount_cents;
              return (
                <motion.div key={o.key} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.04 }}>
                  <Link
                    to={`/suche?route=${o.route.id}&richtung=${o.direction}`}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <RoutePath from={o.from} to={o.to} compact />
                      <p className="mt-2 text-sm text-muted-foreground">
                        ~{o.route.duration_min} Min · Festpreis {formatEuro(o.route.fixed_price_cents)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">ab</p>
                      <p className="font-display text-xl font-bold">
                        {formatEuro(perPerson)}
                        <span className="text-xs font-medium text-muted-foreground"> p.P.</span>
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="so-funktionierts" className="border-t border-border">
        <div className="container py-16 md:py-24">
          <motion.h2 {...fadeUp} className="text-3xl font-bold md:text-4xl">
            So funktioniert's
          </motion.h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: "Fahrt finden oder anbieten",
                text: "Wähle Strecke, Datum und Uhrzeit. Der Initiator legt die Fahrt an — alle anderen steigen mit einem Klick ein.",
              },
              {
                icon: HandCoins,
                title: "Festen Anteil zahlen",
                text: "Fester Streckenpreis, fair geteilt. Mitfahrer zahlen ihren Anteil plus 15 % Servicegebühr sicher per Karte — das Geld bleibt bis nach der Fahrt bei uns.",
              },
              {
                icon: PhoneCall,
                title: "Taxi wird bestellt",
                text: "Der Initiator ruft eine empfohlene Taxizentrale an und zahlt den Fahrer direkt — klassisch und zuverlässig.",
              },
              {
                icon: Users,
                title: "Fahren & auszahlen lassen",
                text: "Nach der Fahrt bekommt der Initiator alle Anteile automatisch aufs Konto. Fertig.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.06 }}
                className="rounded-2xl border border-border/70 bg-card p-6 shadow-lift"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                  <step.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="mb-1.5 font-display text-xs font-bold text-muted-foreground">
                  0{i + 1}
                </p>
                <h3 className="mb-2 font-display text-lg font-bold leading-snug">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Trust / policy ---------------- */}
      <section className="border-t border-border bg-foreground text-background">
        <div className="container py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <motion.div {...fadeUp}>
              <h2 className="text-3xl font-bold md:text-4xl">
                Dein Geld ist <span className="serif-accent text-accent">abgesichert</span>.
              </h2>
              <p className="mt-4 max-w-md text-background/70">
                Wir halten jede Zahlung treuhänderisch, bis die Fahrt stattgefunden
                hat. Klare Regeln für jeden Fall — ohne Kleingedrucktes.
              </p>
            </motion.div>
            <motion.ul {...fadeUp} className="space-y-4">
              {[
                ["Bis 24 h vor Abfahrt", "Kostenlos stornieren, volle Rückerstattung."],
                ["Initiator sagt ab", "Alle Mitfahrer erhalten ihr Geld vollständig zurück."],
                ["Fahrt fand nicht statt?", "Problem melden — die Auszahlung wird sofort pausiert und geprüft."],
                ["Auszahlung", "48 h nach der Fahrt automatisch auf das Konto des Initiators."],
              ].map(([title, text]) => (
                <li key={title} className="flex gap-3.5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <p className="text-sm leading-relaxed text-background/80">
                    <strong className="block text-background">{title}</strong>
                    {text}
                  </p>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="border-t border-border">
        <div className="container max-w-3xl py-16 md:py-24">
          <motion.h2 {...fadeUp} className="mb-8 text-3xl font-bold md:text-4xl">
            Häufige Fragen
          </motion.h2>
          <motion.div {...fadeUp}>
            <Accordion type="single" collapsible className="w-full">
              {[
                [
                  "Wie wird der Preis berechnet?",
                  "Jede Strecke hat einen festen Gesamtpreis (z. B. Kiel ↔ Hamburg Airport: 150 €). Dieser wird durch die Anzahl der Plätze geteilt. Mitfahrer zahlen ihren Anteil plus 15 % Servicegebühr — der Initiator zahlt das Taxi und erhält die Anteile automatisch ausgezahlt.",
                ],
                [
                  "Was passiert, wenn ich stornieren muss?",
                  "Bis 24 Stunden vor Abfahrt kostenlos mit voller Rückerstattung. Danach wird der Betrag einbehalten und geht an den Initiator, der fest mit dir geplant hat.",
                ],
                [
                  "Was, wenn der Initiator absagt?",
                  "Sagt der Initiator rechtzeitig ab, kann ein Mitfahrer die Fahrt übernehmen — sonst wird sie aufgelöst und alle bekommen ihr Geld vollständig zurück. Bei kurzfristiger Absage gibt es zusätzlich einen Strike: Nach drei Strikes wird das Konto gesperrt.",
                ],
                [
                  "Wer bestellt das Taxi?",
                  "Der Initiator — ganz klassisch per Anruf bei einer unserer empfohlenen Taxizentralen. Tipp: Das Taxi aus der kleineren Stadt ist meist günstiger. Die Nummern stehen direkt auf der Fahrtseite.",
                ],
                [
                  "Wie sicher ist die Bezahlung?",
                  "Zahlungen laufen über Stripe (Karte, Apple Pay, Google Pay). Das Geld liegt bis 48 Stunden nach der Fahrt bei uns und wird erst dann an den Initiator ausgezahlt — bei Problemen wird die Auszahlung pausiert.",
                ],
              ].map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left font-display font-semibold">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="border-t border-border bg-card/50">
        <div className="container py-16 text-center md:py-24">
          <motion.div {...fadeUp}>
            <h2 className="mx-auto max-w-xl text-3xl font-bold md:text-5xl">
              Nächster Flug? <span className="serif-accent">Teil dir's.</span>
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/suche">Fahrten finden <ArrowRight /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/fahrt-erstellen">Fahrt anbieten</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
