import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const rideGroupId = searchParams.get("ride_group_id");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center taxi-shadow-card"
        >
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-taxi-success" />
          <h1 className="mb-2 font-display text-2xl font-bold text-card-foreground">
            Zahlung reserviert!
          </h1>
          <p className="mb-6 text-muted-foreground">
            Dein geschätzter Anteil wurde auf deiner Karte reserviert. 
            Der finale Betrag wird erst nach der Fahrt abgebucht.
          </p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-primary px-6 py-3 font-display font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            Zurück zur Startseite
          </Link>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
