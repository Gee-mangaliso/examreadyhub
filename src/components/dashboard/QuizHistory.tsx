import { useEffect, useState } from "react";
import { Trophy, ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Attempt {
  id: string;
  score: number;
  total_questions: number;
  answers: Record<string, string>;
  completed_at: string;
  quiz_title: string;
  quiz_id: string;
}

interface QuestionDetail {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
}

const QuizHistory = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, QuestionDetail[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, answers, completed_at, quiz_id, quizzes(title)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(20) as { data: any[] | null };

      setAttempts(
        (data || []).map((a: any) => ({
          ...a,
          quiz_title: a.quizzes?.title || "Quiz",
          answers: typeof a.answers === "object" ? a.answers : {},
        }))
      );
      setLoading(false);
    };
    fetch();
  }, [user]);

  const toggleExpand = async (attempt: Attempt) => {
    if (expandedId === attempt.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(attempt.id);
    if (!questions[attempt.quiz_id]) {
      setLoadingQuestions(attempt.id);
      const { data } = await supabase
        .from("quiz_questions")
        .select("id, question, options, correct_answer, explanation, sort_order")
        .eq("quiz_id", attempt.quiz_id)
        .order("sort_order");
      setQuestions((prev) => ({
        ...prev,
        [attempt.quiz_id]: (data || []).map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
        })),
      }));
      setLoadingQuestions(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-card min-h-[180px] flex items-center justify-center">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg">Quiz History</h2>
      </div>
      {attempts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Past quiz results will appear here.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {attempts.map((a) => {
            const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0;
            const isExpanded = expandedId === a.id;
            const qs = questions[a.quiz_id] || [];
            return (
              <div key={a.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(a)}
                  className="flex items-center gap-3 p-3 w-full hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.quiz_title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{a.score}/{a.total_questions}</span>
                      <Progress value={pct} className="h-1 w-16" />
                      <span className="text-xs font-medium text-foreground">{pct}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">
                    {new Date(a.completed_at).toLocaleDateString()}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-border p-3 bg-muted/30 space-y-3">
                    {loadingQuestions === a.id ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : qs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Questions not available.</p>
                    ) : (
                      qs.map((q, idx) => {
                        const userAnswer = a.answers[String(idx)] || "";
                        const isCorrect = userAnswer === q.correct_answer;
                        return (
                          <div key={q.id} className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              {isCorrect ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                              )}
                              <p className="text-sm text-foreground">{idx + 1}. {q.question}</p>
                            </div>
                            <div className="ml-6 space-y-0.5">
                              {!isCorrect && userAnswer && (
                                <p className="text-xs text-destructive">Your answer: {userAnswer}</p>
                              )}
                              <p className="text-xs text-green-600">Correct: {q.correct_answer}</p>
                              {q.explanation && (
                                <p className="text-xs text-muted-foreground italic mt-1">{q.explanation}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuizHistory;
