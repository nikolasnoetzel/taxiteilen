import { useState } from "react";
import { Loader2, Euro, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type FinalizeRideProps = {
  rideGroupId: string;
  numRiders: number;
};

const FinalizeRide = ({ rideGroupId, numRiders }: FinalizeRideProps) => {
  const { toast } = useToast();
  const [finalPrice, setFinalPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFinalize = async () => {
    const priceCents = Math.round(Number(finalPrice) * 100);
    if (!priceCents || priceCents <= 0) {
      toast({ title: "Fehler", description: "Bitte gib den Endpreis ein.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("capture-payments", {
        body: { ride_group_id: rideGroupId, final_price_cents: priceCents },
      });
      if (error) throw error;
      setDone(true);
      toast({ title: "Abrechnung abgeschlossen!", description: `${data.results?.length || 0} Zahlungen verarbeitet.` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg bg-taxi-success/10 p-5 text-center">
        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-taxi-success" />
        <p className="font-display font-semibold text-card-foreground">Fahrt abgerechnet!</p>
        <p className="text-sm text-muted-foreground">Alle Mitfahrer wurden belastet.</p>
      </div>
    );
  }

  const perPerson = finalPrice ? Math.ceil((Number(finalPrice) * 1.1) / numRiders) : 0;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
      <h3 className="mb-3 font-display font-semibold text-card-foreground">
        <Euro className="mb-0.5 mr-1.5 inline-block h-4 w-4 text-primary" />
        Fahrt abschließen
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Gib den tatsächlichen Taxipreis ein, um die Mitfahrer abzurechnen.
      </p>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          placeholder="z.B. 125"
          value={finalPrice}
          onChange={(e) => setFinalPrice(e.target.value)}
          className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-lg font-semibold text-card-foreground">€</span>
      </div>
      {perPerson > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          → {perPerson} € pro Person (inkl. 10% Gebühr) bei {numRiders} Personen
        </p>
      )}
      <button
        onClick={handleFinalize}
        disabled={loading || !finalPrice}
        className="w-full rounded-lg bg-secondary py-2.5 font-display font-semibold text-secondary-foreground transition-all hover:brightness-110 disabled:opacity-50"
      >
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Abrechnen & Fahrt abschließen"}
      </button>
    </div>
  );
};

export default FinalizeRide;
