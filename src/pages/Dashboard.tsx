import { useEffect, useState } from "react";
import { User, BarChart3, Clock, Trophy, Sparkles, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import StudyStreak from "@/components/StudyStreak";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Grade { id: string; name: string; sort_order: number }
interface Subject { id: string; name: string; icon: string | null; grade_id: string }
interface UserSubject { id: string; subject_id: string; subjects: Subject }

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: Icons.Calculator, Atom: Icons.Atom, Leaf: Icons.Leaf,
  BookText: Icons.BookText, Globe: Icons.Globe, Landmark: Icons.Landmark,
  PiggyBank: Icons.PiggyBank, Briefcase: Icons.Briefcase, TrendingUp: Icons.TrendingUp,
  Monitor: Icons.Monitor,
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [mySubjects, setMySubjects] = useState<UserSubject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMySubjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_subjects")
      .select("id, subject_id, subjects(id, name, icon, grade_id)")
      .eq("user_id", user.id) as { data: any[] | null };
    setMySubjects((data || []) as UserSubject[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMySubjects();
    supabase.from("grades").select("*").order("sort_order").then(({ data }) => setGrades(data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedGrade) { setAvailableSubjects([]); return; }
    supabase.from("subjects").select("*").eq("grade_id", selectedGrade)
      .then(({ data }) => setAvailableSubjects(data || []));
  }, [selectedGrade]);

  const addSubject = async (subjectId: string) => {
    if (!user) return;
    const already = mySubjects.some(s => s.subject_id === subjectId);
    if (already) { toast({ title: "Already added", variant: "destructive" }); return; }
    const { error } = await supabase.from("user_subjects").insert({ user_id: user.id, subject_id: subjectId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Subject added!" });
    fetchMySubjects();
  };

  const removeSubject = async (id: string) => {
    await supabase.from("user_subjects").delete().eq("id", id);
    fetchMySubjects();
  };

  // Group subjects by grade
  const groupedSubjects = mySubjects.reduce<Record<string, { gradeName: string; subjects: UserSubject[] }>>((acc, us) => {
    const grade = grades.find(g => g.id === us.subjects?.grade_id);
    const key = grade?.id || "unknown";
    if (!acc[key]) acc[key] = { gradeName: grade?.name || "Unknown", subjects: [] };
    acc[key].subjects.push(us);
    return acc;
  }, {});

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Profile card */}
            <div className="bg-card border border-border rounded-lg p-6 shadow-card flex items-center gap-5 mb-10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-heading text-foreground">
                  Welcome, {profile?.full_name || "Learner"}
                </h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
            </div>

            {/* Study Streak */}
            <StudyStreak />

            {/* My Subjects */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading text-foreground">My Subjects</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a Subject</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger><SelectValue placeholder="Select a grade" /></SelectTrigger>
                      <SelectContent>
                        {grades.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableSubjects.length > 0 && (
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        {availableSubjects.map(s => {
                          const already = mySubjects.some(ms => ms.subject_id === s.id);
                          return (
                            <button
                              key={s.id}
                              disabled={already}
                              onClick={() => addSubject(s.id)}
                              className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
                            >
                              {(() => { const Icon = iconMap[s.icon || ""] || Icons.BookOpen; return <Icon className="h-4 w-4 text-primary shrink-0" />; })()}
                              <span className="text-sm text-foreground">{s.name}</span>
                              {already && <span className="text-xs text-muted-foreground ml-auto">Added</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : mySubjects.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-10 shadow-card text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't added any subjects yet.</p>
                <p className="text-muted-foreground text-sm mt-1">Click "Add Subject" to get started.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedSubjects)
                  .sort(([, a], [, b]) => a.gradeName.localeCompare(b.gradeName))
                  .map(([gradeId, group]) => (
                  <div key={gradeId}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">{group.gradeName}</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.subjects.map(us => {
                        const Icon = iconMap[us.subjects?.icon || ""] || Icons.BookOpen;
                        const grade = grades.find(g => g.id === us.subjects?.grade_id);
                        const gradeNum = grade?.name?.replace("Grade ", "") || "";
                        return (
                          <div key={us.id} className="bg-card border border-border rounded-lg p-5 shadow-card flex items-center gap-4 group relative">
                            <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link
                                to={`/grades/${gradeNum}/subjects/${encodeURIComponent(us.subjects?.name || "")}`}
                                className="font-body font-medium text-foreground hover:text-primary transition-colors block truncate"
                              >
                                {us.subjects?.name}
                              </Link>
                            </div>
                            <button
                              onClick={() => removeSubject(us.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                              title="Remove subject"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats cards */}
            <div className="grid sm:grid-cols-2 gap-6 mt-10">
              {[
                { title: "Performance Summary", icon: BarChart3, desc: "Your scores and progress will appear here." },
                { title: "Recent Activity", icon: Clock, desc: "Your recent study sessions will appear here." },
                { title: "Quiz History", icon: Trophy, desc: "Past quiz results will appear here." },
                { title: "Suggestions", icon: Sparkles, desc: "Personalised study recommendations will appear here." },
              ].map((c) => (
                <div key={c.title} className="bg-card border border-border rounded-lg p-6 shadow-card space-y-3 min-h-[180px]">
                  <div className="flex items-center gap-2 text-foreground">
                    <c.icon className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg">{c.title}</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
