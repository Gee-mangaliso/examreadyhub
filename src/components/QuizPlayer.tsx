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
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<number, { selected: string; correct: boolean }>>({});
  const [finished, setFinished] = useState(false);

  const current = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const score = Object.values(answers).filter((a) => a.correct).length;

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
  };

  const handleCheck = () => {
    if (!selectedAnswer) return;
    const correct = selectedAnswer === current.correct_answer;
    setAnswers((prev) => ({ ...prev, [currentIndex]: { selected: selectedAnswer, correct } }));
    setShowResult(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setFinished(true);
      // Save attempt
      if (user) {
        const finalAnswers = { ...answers, [currentIndex]: { selected: selectedAnswer!, correct: selectedAnswer === current.correct_answer } };
        const finalScore = Object.values(finalAnswers).filter((a) => a.correct).length;
        const { error } = await supabase.from("quiz_attempts").insert({
          quiz_id: quiz.id,
          user_id: user.id,
          score: finalScore,
          total_questions: questions.length,
          answers: finalAnswers as any,
        });
        if (error) toast.error("Failed to save quiz attempt");
      }
    }
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="bg-card border border-border rounded-lg p-8 shadow-card text-center space-y-4">
        <Trophy className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-2xl font-heading text-foreground">Quiz Complete!</h2>
        <p className="text-muted-foreground">{quiz.title}</p>
        <div className="text-4xl font-bold text-foreground">{score}/{questions.length}</div>
        <p className="text-muted-foreground">{pct}% correct</p>
        <Progress value={pct} className="h-3 max-w-xs mx-auto" />
        <div className="flex gap-3 justify-center pt-4">
          <Button variant="outline" onClick={onBack}><RotateCcw className="h-4 w-4 mr-2" />Back to Quizzes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-card space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Question {currentIndex + 1} of {questions.length}</span>
        <span className="text-sm font-medium text-foreground">{score} correct</span>
      </div>
      <Progress value={progress} className="h-2" />

      <h3 className="text-lg font-medium text-foreground">{current.question}</h3>

      <div className="space-y-3">
        {(current.options as string[]).map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === current.correct_answer;
          let cls = "border border-border bg-background hover:border-primary/50 cursor-pointer";
          if (showResult) {
            if (isCorrect) cls = "border-2 border-green-500 bg-green-500/10";
            else if (isSelected && !isCorrect) cls = "border-2 border-red-500 bg-red-500/10";
            else cls = "border border-border bg-background opacity-60";
          } else if (isSelected) {
            cls = "border-2 border-primary bg-primary/10";
          }

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between ${cls}`}
            >
              <span className="text-foreground text-sm">{option}</span>
              {showResult && isCorrect && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
              {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
            </button>
          );
        })}
      </div>

      {showResult && current.explanation && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground"><strong>Explanation:</strong> {current.explanation}</p>
        </div>
      )}

      <div className="flex justify-end">
        {!showResult ? (
          <Button onClick={handleCheck} disabled={!selectedAnswer}>Check Answer</Button>
        ) : (
          <Button onClick={handleNext}>
            {currentIndex < questions.length - 1 ? <>Next <ArrowRight className="h-4 w-4 ml-1" /></> : "Finish Quiz"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizPlayer;
