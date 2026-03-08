import { useState } from "react";
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

interface QuizPlayerProps {
  quiz: Quiz;
  questions: Question[];
  onBack: () => void;
}

const QuizPlayer = ({ quiz, questions, onBack }: QuizPlayerProps) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const current = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelect = (option: string) => {
    setSelectedAnswer(option);
  };

  const handleNext = () => {
    if (!selectedAnswer) return;
    const updated = { ...answers, [currentIndex]: selectedAnswer };
    setAnswers(updated);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(updated[currentIndex + 1] || null);
    } else {
      // All questions answered — finish
      finishQuiz(updated);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const updated = selectedAnswer ? { ...answers, [currentIndex]: selectedAnswer } : answers;
      setAnswers(updated);
      setCurrentIndex((i) => i - 1);
      setSelectedAnswer(updated[currentIndex - 1] || null);
    }
  };

  const finishQuiz = async (finalAnswers: Record<number, string>) => {
    setFinished(true);
    if (user) {
      const score = questions.filter((q, i) => finalAnswers[i] === q.correct_answer).length;
      const { error } = await supabase.from("quiz_attempts").insert({
        quiz_id: quiz.id,
        user_id: user.id,
        score,
        total_questions: questions.length,
        answers: finalAnswers as any,
      });
      if (error) toast.error("Failed to save quiz attempt");
    }
  };

  const score = questions.filter((q, i) => answers[i] === q.correct_answer).length;
  const pct = Math.round((score / questions.length) * 100);

  if (finished) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 shadow-card text-center space-y-4">
        <Trophy className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-heading text-foreground">Quiz Complete!</h2>
        <p className="text-muted-foreground">{quiz.title}</p>
        <div className="text-4xl font-bold text-foreground">{score}/{questions.length}</div>
        <p className="text-muted-foreground">{pct}% correct</p>
        <Progress value={pct} className="h-3 max-w-xs mx-auto" />
        <div className="flex gap-3 justify-center pt-4">
          <Button variant="outline" onClick={() => setReviewing(!reviewing)}>
            {reviewing ? "Hide Review" : "Review Answers"}
          </Button>
          <Button variant="outline" onClick={onBack}>
            <RotateCcw className="h-4 w-4 mr-2" />Back to Quizzes
          </Button>
        </div>

        {reviewing && (
          <div className="text-left space-y-4 mt-6">
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const isCorrect = userAnswer === q.correct_answer;
              return (
                <div key={q.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm font-medium text-foreground">{i + 1}. {q.question}</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-7">
                    Your answer: <span className={isCorrect ? "text-green-600 font-medium" : "text-red-500 font-medium"}>{userAnswer}</span>
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-muted-foreground ml-7">
                      Correct answer: <span className="text-green-600 font-medium">{q.correct_answer}</span>
                    </p>
                  )}
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground ml-7 mt-1 italic">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-card space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</span>
        <span className="text-sm text-muted-foreground">{Object.keys(answers).length} answered</span>
      </div>
      <Progress value={progress} className="h-2" />

      <h3 className="text-lg font-medium text-foreground">{current.question}</h3>

      <div className="space-y-3">
        {(current.options as string[]).map((option) => {
          const isSelected = selectedAnswer === option;
          const cls = isSelected
            ? "border-2 border-primary bg-primary/10"
            : "border border-border bg-background hover:border-primary/50 cursor-pointer";

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between ${cls}`}
            >
              <span className="text-foreground text-sm">{option}</span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          ← Previous
        </Button>
        <Button onClick={handleNext} disabled={!selectedAnswer}>
          {currentIndex < questions.length - 1 ? <>Next <ArrowRight className="h-4 w-4 ml-1" /></> : "Finish Quiz"}
        </Button>
      </div>
    </div>
  );
};

export default QuizPlayer;
