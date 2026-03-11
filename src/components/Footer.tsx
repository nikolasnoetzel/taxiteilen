import { Car } from "lucide-react";

const Footer = () => {
  return (
    <footer className="taxi-gradient-hero px-4 py-12">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold text-secondary-foreground">
            TaxiTeilen
          </span>
        </div>

        <div className="mb-8 text-center text-sm text-secondary-foreground/50 space-y-2">
          <p>
            TaxiTeilen vermittelt lediglich Mitfahrgelegenheiten und ist kein Zahlungspartner der Taxiunternehmen.
          </p>
          <p>
            Die Buchung und Bezahlung des Taxis erfolgt direkt durch den Initiator beim jeweiligen Taxiunternehmen.
          </p>
          <p>TaxiTeilen erhebt eine Servicegebühr von 10% für die Vermittlung.</p>
        </div>

        <div className="border-t border-secondary-foreground/10 pt-6 text-center text-xs text-secondary-foreground/30">
          © {new Date().getFullYear()} TaxiTeilen. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
