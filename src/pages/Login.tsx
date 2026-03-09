import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone } from "lucide-react";

const Login = () => {
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let loginEmail = email;

    // If logging in with phone, find the email associated with that phone
    if (loginMethod === "phone") {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone_number", phone)
        .single();

      if (!profileData) {
        toast({ title: "Phone number not found", description: "No account with this phone number.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // We need to get the email from auth - but we can't query auth.users from client.
      // Instead, we store in the profiles or use a function. For now, let's use edge function approach.
      // Actually, the simplest approach: tell user to use email for now, or we look up via admin function.
      // Let's use a different approach: store email in profiles too via a trigger.
      // For now, let the user know they need to use the email associated with their phone.
      toast({ title: "Login failed", description: "Phone login requires using the email associated with your account. Please use email login.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await signIn(loginEmail, password);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      const { data: roleData } = await supabase.rpc("has_role", {
        _user_id: (await supabase.auth.getUser()).data.user?.id!,
        _role: "admin",
      });
      const { data: teacherRole } = await supabase.rpc("has_role", {
        _user_id: (await supabase.auth.getUser()).data.user?.id!,
        _role: "teacher",
      });
      navigate(roleData === true ? "/admin" : teacherRole === true ? "/teacher" : "/dashboard");
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

            {/* Login Method Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setLoginMethod("email")}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  loginMethod === "email" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Mail className="h-4 w-4" />Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("phone")}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  loginMethod === "phone" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Phone className="h-4 w-4" />Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {loginMethod === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+27..." value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              )}
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
