import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/grades", label: "Grades" },
    { to: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
        <Link to="/" className="flex items-center gap-2 text-foreground font-heading text-xl">
          <GraduationCap className="h-6 w-6 text-primary" />
          ExamReady Hub
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === l.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Button asChild size="sm" variant="outline">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t bg-card px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-2">
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            </Button>
            <Button asChild size="sm" className="flex-1">
              <Link to="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
