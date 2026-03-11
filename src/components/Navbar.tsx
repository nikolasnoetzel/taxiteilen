import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

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
        </div>
      )}
    </nav>
  );
};

export default Navbar;
