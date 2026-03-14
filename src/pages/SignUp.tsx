import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import OTPVerification from "@/components/OTPVerification";
import { GraduationCap, BookOpenCheck, Mail, Phone } from "lucide-react";

const SignUp = () => {
  const [name, setName] = useState("");
  const [regMethod, setRegMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"user" | "teacher">("user");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    if (regMethod === "email" && !email) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (regMethod === "phone" && !phone) {
      toast({ title: "Phone number is required", variant: "destructive" });
      return;
    }

    // Phone registration: verify OTP first
    if (regMethod === "phone" && !phoneVerified) {
      setStep("otp");
      return;
    }

    await doSignUp();
  };

  const doSignUp = async () => {
    setLoading(true);
    // For phone registration, we generate a placeholder email
    const signUpEmail = regMethod === "email" ? email : `${phone.replace(/\+/g, "")}@phone.examready.local`;
    const { error } = await signUp(signUpEmail, password, name, role, regMethod === "phone" ? phone : undefined);
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      if (regMethod === "email") {
        toast({ title: "Check your email", description: "We sent you a confirmation link." });
      } else {
        toast({ title: "Account created!", description: "You can now log in with your phone number." });
      }
      navigate("/login");
    }
  };

  if (step === "otp") {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-heading text-foreground">Verify Phone</h1>
                <p className="text-muted-foreground mt-1 text-sm">We'll send a code to verify your number</p>
              </div>
              <OTPVerification
                phoneNumber={phone}
                onVerified={() => {
                  setPhoneVerified(true);
                  setStep("form");
                  doSignUp();
                }}
              />
              <Button variant="ghost" className="w-full" onClick={() => setStep("form")}>
                Back
              </Button>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-heading text-foreground">Create an account</h1>
              <p className="text-muted-foreground mt-1 text-sm">Join ExamReady Hub and start preparing</p>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  role === "user"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <GraduationCap className={`h-8 w-8 mx-auto mb-2 ${role === "user" ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm font-medium ${role === "user" ? "text-primary" : "text-foreground"}`}>Learner</p>
                <p className="text-xs text-muted-foreground mt-0.5">Study & take quizzes</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  role === "teacher"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <BookOpenCheck className={`h-8 w-8 mx-auto mb-2 ${role === "teacher" ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm font-medium ${role === "teacher" ? "text-primary" : "text-foreground"}`}>Teacher</p>
                <p className="text-xs text-muted-foreground mt-0.5">Share & manage</p>
              </button>
            </div>

            {/* Registration Method Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setRegMethod("email")}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  regMethod === "email" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Mail className="h-4 w-4" />Email
              </button>
              <button
                type="button"
                onClick={() => setRegMethod("phone")}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  regMethod === "phone" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Phone className="h-4 w-4" />Phone
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              {regMethod === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+27..." value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  {phoneVerified && <p className="text-xs text-emerald-600 flex items-center gap-1">✓ Phone verified</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : `Register as ${role === "teacher" ? "Teacher" : "Learner"}`}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Login</Link>
            </p>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default SignUp;
