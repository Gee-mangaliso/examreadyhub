import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import QuizPlayer from "@/components/QuizPlayer";
import { LockdownBrowser } from "@/components/LockdownBrowser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
}

const TakeQuiz = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockdownReady, setLockdownReady] = useState(false);

  const lockdown = (location.state as any)?.lockdown === true;
  const activityId = (location.state as any)?.activityId as string | undefined;

  useEffect(() => {
    if (!quizId) return;
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    const { data: quizData } = await supabase
      .from("quizzes")
      .select("id, title, description, time_limit_minutes")
      .eq("id", quizId!)
      .single();

    if (!quizData) {
      toast({ title: "Quiz not found", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    const { data: questionData } = await supabase
      .from("quiz_questions")
      .select("id, question, options, correct_answer, explanation, sort_order")
      .eq("quiz_id", quizId!)
      .order("sort_order");

    setQuiz(quizData);
    setQuestions((questionData || []) as Question[]);
    setLoading(false);
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleViolation = (type: string) => {
    console.warn("Lockdown violation:", type);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </PageTransition>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center px-4">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">This quiz has no questions yet.</p>
              <button onClick={handleBack} className="text-primary hover:underline text-sm">
                Back to Dashboard
              </button>
            </div>
          </main>
        </div>
      </PageTransition>
    );
  }

  // Lockdown mode
  if (lockdown) {
    return (
      <PageTransition>
        <LockdownBrowser
          quizId={quiz.id}
          activityId={activityId}
          onReady={() => setLockdownReady(true)}
          onViolation={handleViolation}
        >
          {lockdownReady ? (
            <div className="p-6 max-w-4xl mx-auto pt-16">
              <QuizPlayer quiz={quiz} questions={questions} onBack={handleBack} />
            </div>
          ) : null}
        </LockdownBrowser>
      </PageTransition>
    );
  }

  // Normal mode
  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <QuizPlayer quiz={quiz} questions={questions} onBack={handleBack} />
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default TakeQuiz;
