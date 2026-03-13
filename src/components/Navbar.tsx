import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-border taxi-glass">
      <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-bold text-foreground">TaxiTeilen</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 sm:flex">
          <a href="/#routes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Strecken
          </a>
          <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            So funktioniert's
          </a>
          {user ? (
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Meine Fahrten
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
                <LogOut className="h-4 w-4" />
                Abmelden
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="hero" size="sm">Anmelden</Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="sm:hidden text-foreground">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background px-4 py-4 sm:hidden">
          <a href="/#routes" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-foreground">
            Strecken
          </a>
          <a href="/#how-it-works" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-foreground">
            So funktioniert's
          </a>
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-foreground">
                Meine Fahrten
              </Link>
              <button onClick={() => { signOut(); setOpen(false); }} className="block py-2 text-sm font-medium text-foreground">
                Abmelden
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-primary">
              Anmelden
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
