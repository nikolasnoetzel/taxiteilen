import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Euro, Percent } from "lucide-react";

const CostCalculator = () => {
  const [totalCost, setTotalCost] = useState(125);
  const [numPeople, setNumPeople] = useState(2);

  const serviceFee = totalCost * 0.1;
  const totalWithFee = totalCost + serviceFee;
  const perPerson = Math.ceil(totalWithFee / numPeople);

  return (
    <section ref={ref} className="bg-background px-4 py-20">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-foreground md:text-4xl">
            Kosten berechnen
          </h2>
          <p className="text-muted-foreground">
            Sieh wie viel du sparst, wenn du ein Taxi teilst.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 taxi-shadow-card">
          {/* Cost slider */}
          <div className="mb-8">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-card-foreground">
              <Euro className="h-4 w-4 text-primary" />
              Geschätzter Taxipreis
            </label>
            <input
              type="range"
              min={80}
              max={200}
              value={totalCost}
              onChange={(e) => setTotalCost(Number(e.target.value))}
              className="mb-2 w-full accent-[hsl(var(--primary))]"
            />
            <div className="text-right font-display text-2xl font-bold text-card-foreground">
              {totalCost} €
            </div>
          </div>

          {/* People selector */}
          <div className="mb-8">
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-card-foreground">
              <Users className="h-4 w-4 text-primary" />
              Anzahl Mitfahrer
            </label>
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumPeople(n)}
                  className={`flex h-14 w-14 items-center justify-center rounded-lg font-display text-lg font-bold transition-all ${
                    numPeople === n
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-gold)]"
                      : "border border-border bg-muted text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          <motion.div
            key={`${totalCost}-${numPeople}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-lg bg-secondary p-6 text-center"
          >
            <div className="mb-1 flex items-center justify-center gap-2 text-sm text-secondary-foreground/70">
              <Percent className="h-4 w-4" />
              inkl. 10% Servicegebühr ({serviceFee.toFixed(0)} €)
            </div>
            <div className="font-display text-4xl font-bold text-secondary-foreground">
              {perPerson} € <span className="text-lg font-medium text-secondary-foreground/60">/ Person</span>
            </div>
            {numPeople > 1 && (
              <div className="mt-2 text-sm text-taxi-success font-medium">
                Du sparst {totalCost - perPerson} € gegenüber Alleinfahrt!
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
});

CostCalculator.displayName = "CostCalculator";

export default CostCalculator;
