import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Teile dein Flughafen-Taxi und spare bis zu 75&nbsp;%. Fester Preis,
              faire Aufteilung, kostenlose Stornierung bis 24&nbsp;Stunden vor Abfahrt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm">
            <div className="space-y-2.5">
              <p className="font-semibold">Plattform</p>
              <a href="/#strecken" className="block text-muted-foreground hover:text-foreground transition-colors">Strecken</a>
              <a href="/#so-funktionierts" className="block text-muted-foreground hover:text-foreground transition-colors">So funktioniert's</a>
              <Link to="/fahrt-erstellen" className="block text-muted-foreground hover:text-foreground transition-colors">Fahrt anbieten</Link>
            </div>
            <div className="space-y-2.5">
              <p className="font-semibold">Rechtliches</p>
              <Link to="/agb" className="block text-muted-foreground hover:text-foreground transition-colors">AGB</Link>
              <Link to="/datenschutz" className="block text-muted-foreground hover:text-foreground transition-colors">Datenschutz</Link>
              <Link to="/impressum" className="block text-muted-foreground hover:text-foreground transition-colors">Impressum</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            TaxiTeilen vermittelt Fahrgemeinschaften — wir sind kein Taxiunternehmen
            und keine Vertragspartei der Beförderung. © {new Date().getFullYear()} TaxiTeilen
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
