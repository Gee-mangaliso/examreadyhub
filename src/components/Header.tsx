import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Menu, X, Sun, Moon, LogOut, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/NotificationBell";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, profile, isAdmin, signOut } = useAuth();

  const navLinks = [
    { to: "/", label: "Home" },
    ...(user ? [
      { to: "/leaderboard", label: "Leaderboard" },
      { to: "/dashboard", label: "Dashboard" },
      { to: "/profile", label: "Profile" },
    ] : [
      { to: "/grades", label: "Grades" },
    ]),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-2">
          {location.pathname !== "/" && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 text-foreground font-heading text-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            ExamReady Hub
          </Link>
        </div>

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
          <button
            onClick={toggle}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <NotificationBell />
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{profile?.full_name || user.email}</span>
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="outline">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
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
            <button
              onClick={toggle}
              className="p-2 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            {user ? (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { handleSignOut(); setMenuOpen(false); }}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link to="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
