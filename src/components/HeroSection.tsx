import { motion } from "framer-motion";
import { Car, Users, Plane } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="taxi-gradient-hero relative overflow-hidden px-4 py-16 pb-24 md:py-24">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-primary blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-taxi-info blur-[100px]" />
      </div>

      <div className="container relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Plane className="h-4 w-4" />
            Vom Flughafen smart & günstig nach Hause
          </div>

          <h1 className="mb-4 font-display text-4xl font-bold tracking-tight text-secondary-foreground md:text-6xl">
            Taxi teilen.{" "}
            <span className="text-primary">Kosten sparen.</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-secondary-foreground/70 md:text-xl">
            Sieh wer zu einer ähnlichen Uhrzeit ankommt und teile dir ein Taxi vom Flughafen — fair aufgeteilt, einfach organisiert.
          </p>

          <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href="#routes"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all hover:brightness-110"
            >
              <Car className="h-5 w-5" />
              Jetzt Taxi teilen
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-secondary-foreground/20 px-8 font-display font-semibold text-secondary-foreground transition-all hover:border-primary hover:text-primary"
            >
              So funktioniert's
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 grid grid-cols-3 gap-6"
        >
          {[
            { icon: Users, label: "Bis zu 4 teilen", value: "75% sparen" },
            { icon: Car, label: "Taxi ab", value: "25 €/Person" },
            { icon: Plane, label: "Live Flugdaten", value: "Automatisch" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <stat.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
              <div className="font-display text-xl font-bold text-secondary-foreground md:text-2xl">
                {stat.value}
              </div>
              <div className="text-sm text-secondary-foreground/50">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
