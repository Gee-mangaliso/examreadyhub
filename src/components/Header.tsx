import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Menu, X, Sun, Moon, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/NotificationBell";

const Header = React.forwardRef<HTMLElement>((_, ref) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, profile, isAdmin, isTeacher, signOut } = useAuth();

  const navLinks = [
    { to: "/", label: "Home" },
    ...(user
      ? [
          { to: "/leaderboard", label: "Leaderboard" },
          ...(!isAdmin && !isTeacher ? [{ to: "/dashboard", label: "Dashboard" }] : []),
          ...(!isAdmin && !isTeacher ? [{ to: "/invites", label: "Invites" }] : []),
          ...(!isAdmin && !isTeacher ? [{ to: "/teacher-content", label: "Teacher Content" }] : []),
          { to: "/profile", label: "Profile" },
        ]
      : [{ to: "/grades", label: "Grades" }]),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
    ...(isTeacher ? [{ to: "/teacher", label: "Teacher" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header ref={ref} className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {location.pathname !== "/" && (
            <button
              onClick={() => navigate(-1)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 font-heading text-xl text-foreground">
            <GraduationCap className="h-6 w-6 text-primary" />
            ExamReady Hub
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
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
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <NotificationBell />
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{profile?.full_name || user.email}</span>
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" /> Sign Out
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

        <button className="text-foreground md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="space-y-3 border-t bg-card px-4 py-4 md:hidden">
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
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            {user ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  handleSignOut();
                  setMenuOpen(false);
                }}
              >
                <LogOut className="mr-1 h-4 w-4" /> Sign Out
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link to="/login" onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link to="/signup" onClick={() => setMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
});

Header.displayName = "Header";

export default Header;
