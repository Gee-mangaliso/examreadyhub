import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Branding */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-foreground font-heading text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              ExamReady Hub
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Empowering South African high school students with quality study materials, quizzes, and exam preparation tools for Grades 8–12.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2.5">
              <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/grades" className="text-sm text-muted-foreground hover:text-primary transition-colors">Browse Grades</Link></li>
              {user ? (
                <>
                  <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
                  <li><Link to="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">My Profile</Link></li>
                  <li><Link to="/leaderboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Leaderboard</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">Login</Link></li>
                  <li><Link to="/signup" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sign Up</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ExamReady Hub. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
