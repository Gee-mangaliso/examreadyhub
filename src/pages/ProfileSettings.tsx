import { useEffect, useState } from "react";
import {
  User, Camera, Save, LogOut, Trash2, Shield, BookOpen, Trophy,
  Award, Flame, BarChart3, Clock, Mail, GraduationCap, Loader2, Eye, EyeOff, Phone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import OTPVerification from "@/components/OTPVerification";

interface Grade { id: string; name: string }
interface BadgeRow { id: string; awarded_at: string; badges: { name: string; icon: string; description: string | null } }
interface ProgressRow { subject_id: string; notes_read: number; quizzes_completed: number; last_studied_at: string | null; subjects: { name: string } }

const ProfileSettings = () => {
  const { user, profile, isAdmin, isTeacher, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Phone verification on profile
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("");

  // Email update
  const [emailUpdating, setEmailUpdating] = useState(false);

  // Stats
  const [streak, setStreak] = useState(0);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [progressData, setProgressData] = useState<ProgressRow[]>([]);
  const [quizStats, setQuizStats] = useState({ total: 0, avgPct: 0, totalScore: 0 });
  const [subjectCount, setSubjectCount] = useState(0);
  const [joinedDate, setJoinedDate] = useState("");

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sign out confirm
  const [signOutOpen, setSignOutOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setGrade(profile.grade || "");
      setPhoneNumber(profile.phone_number || "");
      setAvatarUrl(profile.avatar_url);
    }
    supabase.from("grades").select("id, name").order("sort_order")
      .then(({ data }) => setGrades(data || []));
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    setJoinedDate(new Date(user.created_at).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" }));

    Promise.all([
      supabase.rpc("get_study_streak", { _user_id: user.id }),
      supabase.from("user_badges").select("id, awarded_at, badges(name, icon, description)").eq("user_id", user.id),
      supabase.from("study_progress").select("subject_id, notes_read, quizzes_completed, last_studied_at, subjects(name)").eq("user_id", user.id),
      supabase.from("quiz_attempts").select("score, total_questions").eq("user_id", user.id),
      supabase.from("user_subjects").select("id").eq("user_id", user.id),
    ]).then(([streakRes, badgesRes, progressRes, quizRes, subjectsRes]) => {
      setStreak(streakRes.data ?? 0);
      setBadges((badgesRes.data || []) as any);
      setProgressData((progressRes.data || []) as any);
      setSubjectCount(subjectsRes.data?.length || 0);

      const attempts = quizRes.data || [];
      const total = attempts.length;
      const totalScore = attempts.reduce((s: number, a: any) => s + a.score, 0);
      const totalQ = attempts.reduce((s: number, a: any) => s + a.total_questions, 0);
      const avgPct = totalQ > 0 ? Math.round((totalScore / totalQ) * 100) : 0;
      setQuizStats({ total, avgPct, totalScore });
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(publicUrl);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    toast({ title: "Avatar updated!" });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, grade: grade || null, phone_number: phoneNumber || null })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
    }
    setSaving(false);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setEmailUpdating(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailUpdating(false);
    if (error) {
      toast({ title: "Email update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your new email", description: "We sent a confirmation link to verify the change." });
      setNewEmail("");
    }
  };

  const handleAddPhone = () => {
    if (!pendingPhone.trim()) {
      toast({ title: "Enter a phone number", variant: "destructive" });
      return;
    }
    setShowPhoneVerify(true);
  };

  const handlePhoneVerified = async () => {
    setPhoneNumber(pendingPhone);
    setShowPhoneVerify(false);
    if (user) {
      await supabase.from("profiles").update({ phone_number: pendingPhone }).eq("user_id", user.id);
    }
    toast({ title: "Phone number added!" });
    setPendingPhone("");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!user || !deletePassword) return;
    setDeleteLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: deletePassword,
    });
    if (authError) {
      toast({ title: "Incorrect password", description: "Please enter your correct password to confirm.", variant: "destructive" });
      setDeleteLoading(false);
      return;
    }
    await signOut();
    toast({ title: "Account deletion requested", description: "Your session has been ended. Contact support if you need full data removal." });
    setDeleteLoading(false);
    setDeleteOpen(false);
    navigate("/");
  };

  const iconMap: Record<string, any> = {
    award: Award, trophy: Trophy, flame: Flame, star: Trophy,
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-10 px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Profile Header Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-primary" />
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <h1 className="text-2xl font-heading text-foreground">{profile?.full_name || "Learner"}</h1>
                  {user?.email && !user.email.endsWith("@phone.examready.local") && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </div>
                  )}
                  {profile?.phone_number && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {profile.phone_number}
                    </div>
                  )}
                  {profile?.grade && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {profile.grade}
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Joined {joinedDate}
                  </div>
                  <div className="pt-1">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isAdmin ? "bg-destructive/10 text-destructive" : isTeacher ? "bg-accent/10 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                      <Shield className="h-3 w-3" />
                      {isAdmin ? "Administrator" : isTeacher ? "Teacher" : "Learner"}
                    </span>
                  </div>
                </div>
              </div>
              {uploading && <p className="text-xs text-muted-foreground text-center mt-2">Uploading avatar...</p>}
            </div>

            {/* Admin Info */}
            {isAdmin && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-3">
                <h2 className="text-lg font-heading text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5 text-destructive" /> Admin Privileges
                </h2>
                <ul className="text-sm text-muted-foreground space-y-1.5 ml-7 list-disc">
                  <li>Manage all subjects, notes, slides, worked examples, quizzes, and exams</li>
                  <li>View and respond to student feedback and testimonials</li>
                  <li>Award badges and manage leaderboard</li>
                  <li>Access platform analytics and student data</li>
                  <li>Manage content suggestions and memo requests</li>
                </ul>
              </div>
            )}

            {/* Quick Stats (Learner) */}
            {!isAdmin && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={<Flame className="h-5 w-5 text-orange-500" />} label="Study Streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} />
                <StatCard icon={<BookOpen className="h-5 w-5 text-primary" />} label="Subjects" value={String(subjectCount)} />
                <StatCard icon={<BarChart3 className="h-5 w-5 text-emerald-500" />} label="Quizzes Taken" value={String(quizStats.total)} />
                <StatCard icon={<Trophy className="h-5 w-5 text-yellow-500" />} label="Avg Score" value={`${quizStats.avgPct}%`} />
              </div>
            )}

            {/* Badges */}
            {!isAdmin && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                <h2 className="text-lg font-heading text-foreground flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-yellow-500" /> Badges Earned
                </h2>
                {badges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No badges earned yet. Keep studying to earn your first badge!</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {badges.map((b) => {
                      const BadgeIcon = iconMap[b.badges?.icon] || Award;
                      return (
                        <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                            <BadgeIcon className="h-5 w-5 text-yellow-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{b.badges?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{b.badges?.description || "Achievement unlocked"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Subject Progress */}
            {!isAdmin && progressData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-card">
                <h2 className="text-lg font-heading text-foreground flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-primary" /> Subject Progress
                </h2>
                <div className="space-y-4">
                  {progressData.map((p) => {
                    const total = p.notes_read + p.quizzes_completed;
                    const pct = Math.min(total * 10, 100);
                    return (
                      <div key={p.subject_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{(p as any).subjects?.name || "Subject"}</span>
                          <span className="text-muted-foreground">{p.notes_read} notes · {p.quizzes_completed} quizzes</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Edit Profile */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
              <h2 className="text-lg font-heading text-foreground">Edit Profile</h2>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </div>

              {/* Email section */}
              <div className="space-y-2">
                <Label>Email</Label>
                {user?.email && !user.email.endsWith("@phone.examready.local") ? (
                  <Input value={user.email} disabled className="opacity-60" />
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">No email linked. Add one to receive notifications.</p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                      <Button onClick={handleUpdateEmail} disabled={emailUpdating} size="sm">
                        {emailUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Phone section */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                {phoneNumber ? (
                  <div className="flex items-center gap-2">
                    <Input value={phoneNumber} disabled className="opacity-60" />
                    <span className="text-xs text-emerald-600 whitespace-nowrap">✓ Verified</span>
                  </div>
                ) : (
                  <>
                    {!showPhoneVerify ? (
                      <div className="flex gap-2">
                        <Input
                          value={pendingPhone}
                          onChange={(e) => setPendingPhone(e.target.value)}
                          placeholder="+27..."
                          type="tel"
                        />
                        <Button onClick={handleAddPhone} size="sm">Verify</Button>
                      </div>
                    ) : (
                      <div className="space-y-3 border border-border rounded-lg p-4">
                        <OTPVerification phoneNumber={pendingPhone} onVerified={handlePhoneVerified} />
                        <Button variant="ghost" size="sm" onClick={() => setShowPhoneVerify(false)} className="w-full">Cancel</Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isAdmin && !isTeacher && (
                <div className="space-y-2">
                  <Label>Preferred Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger><SelectValue placeholder="Select your grade" /></SelectTrigger>
                    <SelectContent>
                      {grades.map(g => (
                        <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {/* Account Actions */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
              <h2 className="text-lg font-heading text-foreground">Account</h2>
              <Separator />
              <Button variant="outline" className="w-full gap-2" onClick={() => setSignOutOpen(true)}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
              {!isAdmin && (
                <Button variant="destructive" className="w-full gap-2" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Delete Account
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Sign Out Confirmation */}
      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent. All your data including progress, quiz history, and badges will be lost. Please enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading || !deletePassword}>
              {deleteLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card border border-border rounded-lg p-4 shadow-card text-center">
    <div className="flex justify-center mb-2">{icon}</div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-bold text-foreground">{value}</p>
  </div>
);

export default ProfileSettings;
