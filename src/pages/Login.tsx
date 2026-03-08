import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      // We need to check admin status after login - fetch it fresh
      const { data: roleData } = await (await import("@/integrations/supabase/client")).supabase.rpc("has_role", {
        _user_id: (await (await import("@/integrations/supabase/client")).supabase.auth.getUser()).data.user?.id!,
        _role: "admin",
      });
      navigate(roleData === true ? "/admin" : "/dashboard");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-heading text-foreground">Welcome back</h1>
              <p className="text-muted-foreground mt-1 text-sm">Log in to your ExamReady Hub account</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Login"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">Sign Up</Link>
            </p>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Login;
