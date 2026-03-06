import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookOpen, Trophy, FileText, TrendingUp } from "lucide-react";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: Icons.Calculator, Atom: Icons.Atom, Leaf: Icons.Leaf,
  BookText: Icons.BookText, Globe: Icons.Globe, Landmark: Icons.Landmark,
  PiggyBank: Icons.PiggyBank, Briefcase: Icons.Briefcase, TrendingUp: Icons.TrendingUp,
  Monitor: Icons.Monitor,
};

interface Grade { id: string; name: string; sort_order: number }
interface UserSubject {
  id: string;
  subject_id: string;
  subjects: { id: string; name: string; icon: string | null; grade_id: string };
}
interface SubjectProgress {
  subject_id: string;
  notes_read: number;
  quizzes_completed: number;
  last_studied_at: string | null;
}
interface QuizAttempt {
  quiz_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  quizzes: { subject_id: string; title: string };
}

const Grades = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [mySubjects, setMySubjects] = useState<UserSubject[]>([]);
  const [progress, setProgress] = useState<SubjectProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("grades").select("id, name, sort_order").order("sort_order")
      .then(({ data }) => setGrades(data || []));

    if (user) {
      Promise.all([
        supabase.from("user_subjects")
          .select("id, subject_id, subjects(id, name, icon, grade_id)")
          .eq("user_id", user.id),
        supabase.from("study_progress")
          .select("subject_id, notes_read, quizzes_completed, last_studied_at")
          .eq("user_id", user.id),
        supabase.from("quiz_attempts")
          .select("quiz_id, score, total_questions, completed_at, quizzes(subject_id, title)")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false }),
      ]).then(([subRes, progRes, quizRes]) => {
        setMySubjects((subRes.data || []) as any);
        setProgress((progRes.data || []) as any);
        setQuizAttempts((quizRes.data || []) as any);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const getGradeNum = (gradeId: string) => {
    const g = grades.find(g => g.id === gradeId);
    return g?.name?.replace("Grade ", "") || "";
  };

  const getProgress = (subjectId: string) =>
    progress.find(p => p.subject_id === subjectId);

  const getSubjectAttempts = (subjectId: string) =>
    quizAttempts.filter(a => a.quizzes?.subject_id === subjectId);

  const getAvgScore = (attempts: QuizAttempt[]) => {
    if (attempts.length === 0) return null;
    const total = attempts.reduce((s, a) => s + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0), 0);
    return Math.round(total / attempts.length);
  };

  // Logged-in user with subjects → show progress view
  if (user && !loading && mySubjects.length > 0) {
    const grouped = mySubjects.reduce<Record<string, { gradeName: string; subjects: UserSubject[] }>>((acc, us) => {
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
              <h1 className="text-3xl sm:text-4xl font-heading text-foreground text-center mb-2">My Progress</h1>
              <p className="text-muted-foreground text-center mb-12">Track your study progress across all your subjects.</p>

              <div className="space-y-10">
                {Object.entries(grouped)
                  .sort(([, a], [, b]) => a.gradeName.localeCompare(b.gradeName))
                  .map(([gradeId, group]) => (
                    <div key={gradeId}>
                      <h2 className="text-lg font-heading text-muted-foreground mb-4">{group.gradeName}</h2>
                      <div className="grid sm:grid-cols-2 gap-5">
                        {group.subjects.map(us => {
                          const Icon = iconMap[us.subjects?.icon || ""] || Icons.BookOpen;
                          const gradeNum = getGradeNum(us.subjects?.grade_id);
                          const prog = getProgress(us.subject_id);
                          const attempts = getSubjectAttempts(us.subject_id);
                          const avg = getAvgScore(attempts);

                          return (
                            <Link
                              key={us.id}
                              to={`/subject-progress/${us.subject_id}`}
                              className="bg-card border border-border rounded-lg p-5 shadow-card hover:shadow-card-hover hover:border-primary/40 transition-all duration-300 block space-y-4"
                            >
                              {/* Subject header */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-heading text-lg text-foreground">{us.subjects?.name}</h3>
                              </div>

                              {/* Stats row */}
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="space-y-1">
                                  <FileText className="h-4 w-4 text-muted-foreground mx-auto" />
                                  <p className="text-lg font-semibold text-foreground">{prog?.notes_read ?? 0}</p>
                                  <p className="text-xs text-muted-foreground">Notes Read</p>
                                </div>
                                <div className="space-y-1">
                                  <Trophy className="h-4 w-4 text-muted-foreground mx-auto" />
                                  <p className="text-lg font-semibold text-foreground">{attempts.length}</p>
                                  <p className="text-xs text-muted-foreground">Quizzes Done</p>
                                </div>
                                <div className="space-y-1">
                                  <TrendingUp className="h-4 w-4 text-muted-foreground mx-auto" />
                                  <p className="text-lg font-semibold text-foreground">{avg !== null ? `${avg}%` : "—"}</p>
                                  <p className="text-xs text-muted-foreground">Avg Score</p>
                                </div>
                              </div>

                              {/* Progress bar */}
                              {avg !== null && (
                                <div className="space-y-1">
                                  <Progress value={avg} className="h-2" />
                                  <p className="text-xs text-muted-foreground text-right">{avg}% average</p>
                                </div>
                              )}

                              {/* Recent quiz results */}
                              {attempts.length > 0 && (
                                <div className="space-y-1.5 pt-1 border-t border-border">
                                  <p className="text-xs font-medium text-muted-foreground pt-2">Recent Quizzes</p>
                                  {attempts.slice(0, 3).map((a, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                      <span className="text-foreground truncate mr-2">{a.quizzes?.title || "Quiz"}</span>
                                      <span className={`font-medium shrink-0 ${a.total_questions > 0 && (a.score / a.total_questions) >= 0.7 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                                        {a.score}/{a.total_questions}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  // Default: grade selection (not logged in or no subjects)
  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-heading text-foreground text-center mb-2">Select Your Grade</h1>
            <p className="text-muted-foreground text-center mb-12">Choose your grade to explore subjects and start studying.</p>
            {loading ? (
              <p className="text-muted-foreground text-center text-sm">Loading...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {grades.map((g, i) => {
                  const num = g.name.replace("Grade ", "");
                  return (
                    <button
                      key={g.id}
                      onClick={() => navigate(`/grades/${num}/subjects`)}
                      className="group bg-card rounded-lg p-8 shadow-card hover:shadow-card-hover transition-all duration-300 text-center space-y-3 border border-border hover:border-primary/40"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="font-heading text-2xl text-foreground">{g.name}</h2>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Grades;
