import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, Plus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navLink =
    "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors";

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        {/* Desktop */}
        <div className="hidden items-center gap-7 md:flex">
          <a href="/#strecken" className={navLink}>Strecken</a>
          <a href="/#so-funktionierts" className={navLink}>So funktioniert's</a>
          {user && (
            <Link to="/dashboard" className={navLink}>Meine Fahrten</Link>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => navigate("/fahrt-erstellen")}>
                <Plus /> Fahrt anbieten
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} title="Abmelden">
                <LogOut />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Anmelden
              </Button>
              <Button size="sm" onClick={() => navigate("/fahrt-erstellen")}>
                <Plus /> Fahrt anbieten
              </Button>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setOpen(!open)}
          aria-label="Menü"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border/60 glass">
          <div className="container flex flex-col gap-1 py-4">
            <a href="/#strecken" className="py-2.5 text-sm font-medium" onClick={() => setOpen(false)}>Strecken</a>
            <a href="/#so-funktionierts" className="py-2.5 text-sm font-medium" onClick={() => setOpen(false)}>So funktioniert's</a>
            {user && (
              <Link to="/dashboard" className="py-2.5 text-sm font-medium" onClick={() => setOpen(false)}>
                Meine Fahrten
              </Link>
            )}
            <div className="flex gap-2 pt-3">
              {user ? (
                <>
                  <Button className="flex-1" onClick={() => { setOpen(false); navigate("/fahrt-erstellen"); }}>
                    <Plus /> Fahrt anbieten
                  </Button>
                  <Button variant="outline" onClick={() => { setOpen(false); signOut(); }}>
                    <LogOut /> Abmelden
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => { setOpen(false); navigate("/auth"); }}>
                    Anmelden
                  </Button>
                  <Button className="flex-1" onClick={() => { setOpen(false); navigate("/fahrt-erstellen"); }}>
                    Fahrt anbieten
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
