import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lock, Clock, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeacherQuiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  lockdown_required: boolean;
  activity_id: string | null;
  due_date: string | null;
  already_taken: boolean;
}

const TeacherQuizzes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchTeacherQuizzes();
  }, [user]);

  const fetchTeacherQuizzes = async () => {
    if (!user) return;

    // Get teacher IDs the student is linked to
    const { data: links } = await supabase
      .from("teacher_students")
      .select("teacher_id")
      .eq("student_id", user.id);

    if (!links || links.length === 0) {
      setLoading(false);
      return;
    }

    const teacherIds = links.map((l) => l.teacher_id);

    // Get teacher activities that have quizzes
    const { data: activities } = await supabase
      .from("teacher_activities")
      .select("id, title, description, quiz_id, lockdown_required, due_date, teacher_id, activity_type")
      .in("teacher_id", teacherIds)
      .eq("activity_type", "quiz")
      .not("quiz_id", "is", null);

    if (!activities || activities.length === 0) {
      setLoading(false);
      return;
    }

    const quizIds = activities.map((a) => a.quiz_id!).filter(Boolean);

    // Get quiz details
    const { data: quizData } = await supabase
      .from("quizzes")
      .select("id, title, description, time_limit_minutes, subject_id, subjects(name)")
      .in("id", quizIds);

    // Get teacher profiles
    const { data: teacherProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", teacherIds);

    // Get student's existing attempts
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_id")
      .eq("user_id", user.id)
      .in("quiz_id", quizIds);

    const attemptedQuizIds = new Set((attempts || []).map((a) => a.quiz_id));

    const quizMap = new Map((quizData || []).map((q: any) => [q.id, q]));
    const teacherMap = new Map((teacherProfiles || []).map((p) => [p.user_id, p.full_name || "Teacher"]));

    const merged: TeacherQuiz[] = activities.map((activity) => {
      const quiz = quizMap.get(activity.quiz_id!) as any;
      return {
        id: quiz?.id || activity.quiz_id!,
        title: quiz?.title || activity.title,
        description: quiz?.description || activity.description,
        time_limit_minutes: quiz?.time_limit_minutes || null,
        subject_name: quiz?.subjects?.name || "Unknown",
        teacher_name: teacherMap.get(activity.teacher_id) || "Teacher",
        teacher_id: activity.teacher_id,
        lockdown_required: activity.lockdown_required,
        activity_id: activity.id,
        due_date: activity.due_date,
        already_taken: attemptedQuizIds.has(activity.quiz_id!),
      };
    });

    setQuizzes(merged);
    setLoading(false);
  };

  if (loading) return null;
  if (quizzes.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-heading text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        Teacher Quizzes
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {quizzes.map((quiz) => (
          <div
            key={`${quiz.id}-${quiz.activity_id}`}
            className="bg-card border border-border rounded-lg p-5 shadow-card space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{quiz.title}</h3>
                {quiz.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{quiz.description}</p>
                )}
              </div>
              {quiz.lockdown_required && (
                <Badge variant="destructive" className="shrink-0 text-xs">
                  <Lock className="h-3 w-3 mr-1" />Lockdown
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />{quiz.teacher_name}
              </span>
              <span>•</span>
              <span>{quiz.subject_name}</span>
              {quiz.time_limit_minutes && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />{quiz.time_limit_minutes} min
                  </span>
                </>
              )}
              {quiz.due_date && (
                <>
                  <span>•</span>
                  <span>Due {new Date(quiz.due_date).toLocaleDateString("en-ZA")}</span>
                </>
              )}
            </div>

            <Button
              size="sm"
              className="w-full gap-1"
              variant={quiz.already_taken ? "outline" : "default"}
              onClick={() =>
                navigate(`/take-quiz/${quiz.id}`, {
                  state: {
                    lockdown: quiz.lockdown_required,
                    activityId: quiz.activity_id,
                  },
                })
              }
            >
              {quiz.already_taken ? "Retake Quiz" : "Take Quiz"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherQuizzes;
