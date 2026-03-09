import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const TeacherRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isTeacher, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isTeacher) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default TeacherRoute;
