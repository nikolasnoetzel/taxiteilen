// AGB-Zustimmung nachholen: Google-OAuth-Signups durchlaufen keine
// Registrierungsmaske mit Checkbox — wer eingeloggt ist, aber nie zugestimmt
// hat (profiles.terms_accepted_at IS NULL), bekommt dieses blockierende
// Overlay. Das Update ist per Column-Grant erlaubt (eigene Zeile,
// terms_accepted_at gehört zu den freigegebenen Spalten).
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-profile";

const TermsGate = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const needsConsent = Boolean(user && profile && !profile.terms_accepted_at);
  if (!needsConsent) return null;

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq("user_id", user!.id);
    setBusy(false);
    if (error) {
      toast.error("Zustimmung konnte nicht gespeichert werden. Bitte versuch es erneut.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile", user!.id] });
  };

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Fast geschafft</AlertDialogTitle>
          <AlertDialogDescription>
            Um TaxiTeilen zu nutzen, bestätige bitte unsere{" "}
            <Link to="/agb" target="_blank" className="text-primary underline">
              AGB
            </Link>{" "}
            und die{" "}
            <Link to="/datenschutz" target="_blank" className="text-primary underline">
              Datenschutzerklärung
            </Link>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => signOut()} disabled={busy}>
            Abmelden
          </Button>
          <Button onClick={accept} disabled={busy}>
            {busy ? "Wird gespeichert…" : "Akzeptieren"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TermsGate;
