import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Ban, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, banInfo, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Show ban screen
  if (banInfo?.is_banned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-xl p-8 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Ban className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-heading text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground text-sm">
            Your account has been suspended by an administrator.
          </p>
          {banInfo.reason && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground"><strong>Reason:</strong> {banInfo.reason}</p>
            </div>
          )}
          {banInfo.ends_at && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Suspended until {format(new Date(banInfo.ends_at), "MMMM d, yyyy 'at' HH:mm")}</span>
            </div>
          )}
          {!banInfo.ends_at && (
            <p className="text-xs text-muted-foreground">This suspension is permanent. Contact your administrator for more information.</p>
          )}
          <Button variant="outline" onClick={signOut} className="mt-4">Sign Out</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
