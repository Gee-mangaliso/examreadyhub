import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Trophy, FileText, TrendingUp, Clock, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: Icons.Calculator, Atom: Icons.Atom, Leaf: Icons.Leaf,
  BookText: Icons.BookText, Globe: Icons.Globe, Landmark: Icons.Landmark,
  PiggyBank: Icons.PiggyBank, Briefcase: Icons.Briefcase, TrendingUp: Icons.TrendingUp,
  Monitor: Icons.Monitor,
};

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  answers: any;
  quizzes: { title: string; description: string | null };
}

interface StudyProgress {
  notes_read: number;
  quizzes_completed: number;
  last_studied_at: string | null;
}

const SubjectProgress = () => {
  const { subjectId } = useParams();
  const { user } = useAuth();
  const [subject, setSubject] = useState<{ name: string; icon: string | null; grade_id: string } | null>(null);
  const [gradeName, setGradeName] = useState("");
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !subjectId) return;

    Promise.all([
      supabase.from("subjects").select("name, icon, grade_id").eq("id", subjectId).single(),
      supabase.from("study_progress")
        .select("notes_read, quizzes_completed, last_studied_at")
        .eq("user_id", user.id).eq("subject_id", subjectId).maybeSingle(),
      supabase.from("quiz_attempts")
        .select("id, quiz_id, score, total_questions, completed_at, answers, quizzes(title, description)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false }),
    ]).then(async ([subRes, progRes, attRes]) => {
      const sub = subRes.data;
      setSubject(sub as any);
      setProgress(progRes.data as any);

      // Filter attempts to this subject's quizzes
      const allAttempts = (attRes.data || []) as any as QuizAttempt[];
      // We need to check which quizzes belong to this subject
      const { data: subjectQuizzes } = await supabase
        .from("quizzes").select("id").eq("subject_id", subjectId!);
      const quizIds = new Set((subjectQuizzes || []).map(q => q.id));
      setAttempts(allAttempts.filter(a => quizIds.has(a.quiz_id)));

      if (sub) {
        const { data: grade } = await supabase
          .from("grades").select("name").eq("id", sub.grade_id).single();
        setGradeName(grade?.name || "");
      }
      setLoading(false);
    });
  }, [user, subjectId]);

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </main>
        </div>
      </PageTransition>
    );
  }

  const Icon = iconMap[subject?.icon || ""] || Icons.BookOpen;
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0), 0) / totalAttempts)
    : null;
  const bestScore = totalAttempts > 0
    ? Math.round(Math.max(...attempts.map(a => a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0)))
    : null;
  const gradeNum = gradeName.replace("Grade ", "");

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Link to="/grades" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to My Progress
            </Link>

            {/* Subject header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-heading text-foreground">{subject?.name}</h1>
                <p className="text-muted-foreground">{gradeName}</p>
              </div>
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { label: "Notes Read", value: progress?.notes_read ?? 0, icon: FileText },
                { label: "Quizzes Taken", value: totalAttempts, icon: Trophy },
                { label: "Avg Score", value: avgScore !== null ? `${avgScore}%` : "—", icon: TrendingUp },
                { label: "Best Score", value: bestScore !== null ? `${bestScore}%` : "—", icon: Icons.Award },
              ].map(stat => (
                <div key={stat.label} className="bg-card border border-border rounded-lg p-4 shadow-card text-center space-y-2">
                  <stat.icon className="h-5 w-5 text-primary mx-auto" />
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Score trend */}
            {avgScore !== null && (
              <div className="bg-card border border-border rounded-lg p-5 shadow-card mb-10 space-y-2">
                <h2 className="font-heading text-lg text-foreground">Overall Performance</h2>
                <Progress value={avgScore} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Average: {avgScore}%</span>
                  <span>Best: {bestScore}%</span>
                </div>
              </div>
            )}

            {/* Quiz history */}
            <div className="space-y-4">
              <h2 className="font-heading text-xl text-foreground">Quiz History</h2>
              {attempts.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 shadow-card text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No quizzes taken yet for this subject.</p>
                  <Link
                    to={`/grades/${gradeNum}/subjects/${encodeURIComponent(subject?.name || "")}`}
                    className="text-primary text-sm hover:underline mt-2 inline-block"
                  >
                    Go to subject →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((a) => {
                    const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0;
                    const passed = pct >= 50;
                    return (
                      <div key={a.id} className="bg-card border border-border rounded-lg p-4 shadow-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {passed ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            <h3 className="font-medium text-foreground">{a.quizzes?.title || "Quiz"}</h3>
                          </div>
                          <span className={`text-lg font-semibold ${passed ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                            {a.score}/{a.total_questions}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(a.completed_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5 mt-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Last studied */}
            {progress?.last_studied_at && (
              <p className="text-xs text-muted-foreground mt-8 text-center">
                Last studied: {format(new Date(progress.last_studied_at), "MMMM d, yyyy")}
              </p>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default SubjectProgress;
