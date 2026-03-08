import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Target, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  totalQuizzes: number;
  totalScore: number;
  totalQuestions: number;
  avgPercentage: number;
  bestPercentage: number;
  streak: number;
}

const PerformanceSummary = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [attemptsRes, streakRes] = await Promise.all([
        supabase.from("quiz_attempts").select("score, total_questions").eq("user_id", user.id),
        supabase.rpc("get_study_streak", { _user_id: user.id }),
      ]);
      const attempts = attemptsRes.data || [];
      const totalQuizzes = attempts.length;
      const totalScore = attempts.reduce((s, a) => s + a.score, 0);
      const totalQuestions = attempts.reduce((s, a) => s + a.total_questions, 0);
      const avgPercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
      const bestPercentage = attempts.length > 0
        ? Math.round(Math.max(...attempts.map((a) => (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0))))
        : 0;
      setStats({
        totalQuizzes, totalScore, totalQuestions, avgPercentage, bestPercentage,
        streak: (streakRes.data as number) || 0,
      });
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-card min-h-[180px] flex items-center justify-center">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats || stats.totalQuizzes === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-3 min-h-[180px]">
        <div className="flex items-center gap-2 text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg">Performance Summary</h2>
        </div>
        <p className="text-muted-foreground text-sm">Take your first quiz to see performance stats here.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg">Performance Summary</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Target className="h-3.5 w-3.5" /> Average Score
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.avgPercentage}%</div>
          <Progress value={stats.avgPercentage} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Best Score
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.bestPercentage}%</div>
          <Progress value={stats.bestPercentage} className="h-1.5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Award className="h-3.5 w-3.5" /> Quizzes Taken
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalQuizzes}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Total Score
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.totalScore}/{stats.totalQuestions}</div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSummary;
