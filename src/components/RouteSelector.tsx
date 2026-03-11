import { motion } from "framer-motion";
import { ArrowRight, Clock, Euro, Phone } from "lucide-react";
import { ROUTES, type Route } from "@/lib/data";
import { useNavigate } from "react-router-dom";

const RouteCard = ({ route }: { route: Route }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group cursor-pointer rounded-xl border border-border bg-card p-6 taxi-shadow-card transition-all hover:border-primary/40 hover:taxi-shadow-card-hover"
      onClick={() => navigate(`/route/${route.id}`)}
    >
      {/* Route header */}
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-md bg-secondary px-3 py-1 font-display text-sm font-semibold text-secondary-foreground">
          {route.fromShort}
        </span>
        <ArrowRight className="h-4 w-4 text-primary" />
        <span className="rounded-md bg-secondary px-3 py-1 font-display text-sm font-semibold text-secondary-foreground">
          {route.toShort}
        </span>
      </div>

      <h3 className="mb-1 font-display text-lg font-semibold text-card-foreground">
        {route.from}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground">→ {route.to}</p>

      {/* Info row */}
      <div className="mb-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Euro className="h-4 w-4 text-primary" />
          {route.estimatedPrice.min}–{route.estimatedPrice.max} €
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          {route.estimatedDuration}
        </span>
      </div>

      {/* Taxi companies */}
      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Empfohlene Taxiunternehmen
        </p>
        <div className="space-y-2">
          {route.taxiCompanies.map((company) => (
            <div key={company.name} className="flex items-center justify-between">
              <span className="text-sm font-medium text-card-foreground">{company.name}</span>
              <a
                href={`tel:${company.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Phone className="h-3 w-3" />
                Anrufen
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-5">
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all group-hover:brightness-110">
          Mitfahrer finden
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </motion.div>
  );
};

const RouteSelector = () => {
  return (
    <section id="routes" className="bg-muted/50 px-4 py-20">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Verfügbare Strecken
          </h2>
          <p className="text-muted-foreground">
            Wähle deine Route und finde Mitfahrer für dein Taxi.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {ROUTES.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RouteSelector;
