import { motion } from "framer-motion";
import { Clock, Users, CreditCard, Car } from "lucide-react";

const steps = [
  {
    icon: Clock,
    title: "Wunschzeit angeben",
    description: "Wähle Datum und Uhrzeit — wann möchtest du ankommen oder losfahren? Optional: Flug verknüpfen für Verspätungs-Alerts.",
  },
  {
    icon: Users,
    title: "Mitfahrer finden",
    description: "Sieh wer noch zu einer ähnlichen Uhrzeit ankommt oder zum Flughafen möchte — ±2 Stunden rund um deine Wunschzeit.",
  },
  {
    icon: CreditCard,
    title: "Initiator werden",
    description: "Eine Person wird Initiator, hinterlegt eine Kreditkarte und bucht das Taxi mindestens 1 Stunde vorher.",
  },
  {
    icon: Car,
    title: "Taxi teilen & sparen",
    description: "Die Kosten werden fair aufgeteilt. 10% Servicegebühr. Stornierung möglich gegen Gebühr.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-background px-4 py-20">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            So funktioniert's
          </h2>
          <p className="text-muted-foreground">In vier einfachen Schritten zum geteilten Taxi.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative rounded-xl border border-border bg-card p-6 taxi-shadow-card transition-all hover:taxi-shadow-card-hover"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="font-display text-4xl font-bold text-muted-foreground/20">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-card-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
