import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { BarChart3, Loader2, Trophy, Users } from "lucide-react";

interface AttemptRow {
  id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  quiz_id: string;
  user_id: string;
  quiz_title?: string;
  student_name?: string;
}

const StudentResults = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get linked student IDs
      const { data: links } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id);

      const studentIds = (links || []).map((l) => l.student_id);
      if (studentIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get quiz attempts for those students
      const { data: rawAttempts } = await supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, completed_at, quiz_id, user_id")
        .in("user_id", studentIds)
        .order("completed_at", { ascending: false })
        .limit(100);

      if (!rawAttempts || rawAttempts.length === 0) {
        setLoading(false);
        return;
      }

      // Get quiz titles
      const quizIds = [...new Set(rawAttempts.map((a) => a.quiz_id))];
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title")
        .in("id", quizIds);

      // Get student names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentIds);

      const quizMap = Object.fromEntries((quizzes || []).map((q) => [q.id, q.title]));
      const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));

      setAttempts(
        rawAttempts.map((a) => ({
          ...a,
          quiz_title: quizMap[a.quiz_id] || "Unknown Quiz",
          student_name: nameMap[a.user_id] || "Unknown",
        }))
      );
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No quiz results yet. Results will appear here once students complete quizzes.</p>
      </div>
    );
  }

  // Summary stats
  const avgScore = Math.round(
    attempts.reduce((sum, a) => sum + (a.score / a.total_questions) * 100, 0) / attempts.length
  );
  const uniqueStudents = new Set(attempts.map((a) => a.user_id)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Trophy className="h-3 w-3" />Avg Score
          </div>
          <span className="text-xl font-bold text-foreground">{avgScore}%</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BarChart3 className="h-3 w-3" />Total Attempts
          </div>
          <span className="text-xl font-bold text-foreground">{attempts.length}</span>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Users className="h-3 w-3" />Active Students
          </div>
          <span className="text-xl font-bold text-foreground">{uniqueStudents}</span>
        </div>
      </div>

      <div className="space-y-2">
        {attempts.map((a) => {
          const pct = Math.round((a.score / a.total_questions) * 100);
          return (
            <div key={a.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{a.student_name}</p>
                <p className="text-xs text-muted-foreground">{a.quiz_title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(a.completed_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="text-right">
                <Badge variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive"}>
                  {a.score}/{a.total_questions} ({pct}%)
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentResults;
