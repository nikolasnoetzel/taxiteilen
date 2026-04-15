import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type PaymentButtonProps = {
  rideGroupId: string;
  estimatedAmountCents: number;
  numPersons: number;
  disabled?: boolean;
};

const PaymentButton = ({ rideGroupId, estimatedAmountCents, numPersons, disabled }: PaymentButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-hold", {
        body: { ride_group_id: rideGroupId, num_persons: numPersons },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Fehler",
        description: err.message || "Zahlung konnte nicht gestartet werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all hover:brightness-110 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <CreditCard className="h-5 w-5" />
          Jetzt beitreten & {(estimatedAmountCents / 100).toFixed(0)} € reservieren
        </>
      )}
    </button>
  );
};

export default PaymentButton;
