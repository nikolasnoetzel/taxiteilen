import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, RefreshCw, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const StripeOnboarding = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "complete" | "incomplete">("idle");

  const isSuccess = searchParams.get("success") === "true";
  const isRefresh = searchParams.get("refresh") === "true";

  useEffect(() => {
    if (isSuccess || isRefresh) {
      checkStatus();
    }
  }, [isSuccess, isRefresh]);

  const checkStatus = async () => {
    setStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status");
      if (error) throw error;
      setStatus(data.onboarded ? "complete" : "incomplete");
    } catch {
      setStatus("incomplete");
    }
  };

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding");
      if (error) throw error;
      if (data.already_complete) {
        setStatus("complete");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Bitte zuerst <Link to="/auth" className="text-primary underline">einloggen</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {status === "complete" ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center taxi-shadow-card">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-taxi-success" />
              <h1 className="mb-2 font-display text-2xl font-bold text-card-foreground">
                Onboarding abgeschlossen!
              </h1>
              <p className="mb-6 text-muted-foreground">
                Du kannst jetzt als Initiator Fahrten erstellen und Zahlungen empfangen.
              </p>
              <Link
                to="/"
                className="inline-block rounded-lg bg-primary px-6 py-3 font-display font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Zur Startseite
              </Link>
            </div>
          ) : status === "checking" ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center taxi-shadow-card">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Status wird geprüft...</p>
            </div>
          ) : status === "incomplete" ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center taxi-shadow-card">
              <RefreshCw className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h1 className="mb-2 font-display text-2xl font-bold text-card-foreground">
                Onboarding noch nicht abgeschlossen
              </h1>
              <p className="mb-6 text-muted-foreground">
                Bitte schließe die Einrichtung ab, um Zahlungen empfangen zu können.
              </p>
              <button
                onClick={startOnboarding}
                disabled={loading}
                className="rounded-lg bg-primary px-6 py-3 font-display font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
              >
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Einrichtung fortsetzen"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center taxi-shadow-card">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h1 className="mb-2 font-display text-2xl font-bold text-card-foreground">
                Zahlungen empfangen
              </h1>
              <p className="mb-2 text-muted-foreground">
                Als Initiator buchst du das Taxi und die Mitfahrer zahlen dir ihren Anteil.
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                Die Einrichtung dauert ca. 2 Minuten. Du brauchst nur deinen Namen, Geburtsdatum und IBAN.
              </p>
              <button
                onClick={startOnboarding}
                disabled={loading}
                className="w-full rounded-lg bg-primary py-3 font-display font-semibold text-primary-foreground shadow-[var(--shadow-gold)] transition-all hover:brightness-110 disabled:opacity-50"
              >
                {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Jetzt einrichten"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default StripeOnboarding;
