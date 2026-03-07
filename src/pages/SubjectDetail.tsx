import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Lock, FileText, Presentation, Lightbulb, HelpCircle, ClipboardList, BookOpen, Play, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import QuizPlayer from "@/components/QuizPlayer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const getSections = (loggedIn: boolean) => [
  { id: "notes", label: "Notes", icon: FileText, locked: false },
  { id: "slides", label: "Slides", icon: Presentation, locked: false },
  { id: "examples", label: "Worked Examples", icon: Lightbulb, locked: false },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle, locked: !loggedIn },
  { id: "exams", label: "Practice Exams", icon: ClipboardList, locked: !loggedIn },
];

interface Note {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
}

const SubjectDetail = () => {
  const { grade, subject } = useParams();
  const { user } = useAuth();
  const subjectName = decodeURIComponent(subject || "");
  const sections = getSections(!!user);

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  // Resolve subject ID from name + grade
  useEffect(() => {
    const fetchSubject = async () => {
      const { data: gradeData } = await supabase
        .from("grades")
        .select("id")
        .eq("name", `Grade ${grade}`)
        .maybeSingle();
      if (!gradeData) { setLoading(false); return; }

      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id")
        .eq("grade_id", gradeData.id)
        .eq("name", subjectName)
        .maybeSingle();
      if (subjectData) setSubjectId(subjectData.id);
      setLoading(false);
    };
    fetchSubject();
  }, [grade, subjectName]);

  // Fetch notes & quizzes when subjectId available
  useEffect(() => {
    if (!subjectId) return;
    const fetchContent = async () => {
      const [notesRes, quizzesRes] = await Promise.all([
        supabase.from("notes").select("*").eq("subject_id", subjectId).order("sort_order"),
        supabase.from("quizzes").select("*").eq("subject_id", subjectId).order("created_at"),
      ]);
      if (notesRes.data) setNotes(notesRes.data);
      if (quizzesRes.data) setQuizzes(quizzesRes.data);
    };
    fetchContent();
  }, [subjectId]);

  const startQuiz = async (quiz: Quiz) => {
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz.id)
      .order("sort_order");
    if (data && data.length > 0) {
      setQuizQuestions(data.map((q) => ({ ...q, options: q.options as unknown as string[] })));
      setActiveQuiz(quiz);
    }
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

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Link to={`/grades/${grade}/subjects`} className="text-sm text-primary hover:underline mb-4 inline-block">
              ← Back to Grade {grade} Subjects
            </Link>
            <h1 className="text-3xl sm:text-4xl font-heading text-foreground mb-1">{subjectName}</h1>
            <p className="text-muted-foreground mb-8">Grade {grade}</p>

            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1 rounded-lg">
                {sections.map((s) => (
                  <TabsTrigger
                    key={s.id}
                    value={s.id}
                    className="flex items-center gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-card"
                  >
                    <s.icon className="h-4 w-4" />
                    {s.label}
                    {s.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* NOTES TAB */}
              <TabsContent value="notes" className="mt-6">
                {notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
                        <button
                          onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                          className="w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <BookOpen className="h-5 w-5 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{note.title}</span>
                        </button>
                        {expandedNote === note.id && note.content && (
                          <div className="px-6 pb-6 border-t border-border pt-4 prose prose-sm max-w-none text-foreground">
                            {note.content.split("\n").map((line, i) => {
                              if (line.startsWith("### ")) return <h4 key={i} className="text-base font-semibold mt-4 mb-2 text-foreground">{line.slice(4)}</h4>;
                              if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-foreground">{line.slice(3)}</h3>;
                              if (line.startsWith("- ")) return <li key={i} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
                              if (line.startsWith("|")) return <p key={i} className="text-muted-foreground font-mono text-xs">{line}</p>;
                              if (line.trim() === "") return <br key={i} />;
                              return <p key={i} className="text-muted-foreground">{line}</p>;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No notes available yet.</p>
                  </div>
                )}
              </TabsContent>

              {/* QUIZZES TAB */}
              <TabsContent value="quizzes" className="mt-6">
                {sections.find((s) => s.id === "quizzes")?.locked ? (
                  <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
                    <Lock className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">Please log in to access quizzes.</p>
                    <Link to="/login" className="mt-4 text-primary hover:underline text-sm">Go to Login →</Link>
                  </div>
                ) : activeQuiz ? (
                  <QuizPlayer quiz={activeQuiz} questions={quizQuestions} onBack={() => setActiveQuiz(null)} />
                ) : quizzes.length > 0 ? (
                  <div className="space-y-4">
                    {quizzes.map((quiz) => (
                      <div key={quiz.id} className="bg-card border border-border rounded-lg p-6 shadow-card flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{quiz.title}</h3>
                          {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
                          {quiz.time_limit_minutes && (
                            <span className="text-xs text-muted-foreground mt-2 inline-block">⏱ {quiz.time_limit_minutes} min</span>
                          )}
                        </div>
                        <Button onClick={() => startQuiz(quiz)} size="sm">
                          <Play className="h-4 w-4 mr-1" /> Start
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
                    <HelpCircle className="h-10 w-10 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No quizzes available yet.</p>
                  </div>
                )}
              </TabsContent>

              {/* EXAMS TAB - reuse quizzes as practice exams for now */}
              <TabsContent value="exams" className="mt-6">
                {sections.find((s) => s.id === "exams")?.locked ? (
                  <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
                    <Lock className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground font-medium">Please log in to access practice exams.</p>
                    <Link to="/login" className="mt-4 text-primary hover:underline text-sm">Go to Login →</Link>
                  </div>
                ) : activeQuiz ? (
                  <QuizPlayer quiz={activeQuiz} questions={quizQuestions} onBack={() => setActiveQuiz(null)} />
                ) : quizzes.length > 0 ? (
                  <div className="space-y-4">
                    {quizzes.map((quiz) => (
                      <div key={quiz.id} className="bg-card border border-border rounded-lg p-6 shadow-card flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{quiz.title} (Practice Exam)</h3>
                          {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
                        </div>
                        <Button onClick={() => startQuiz(quiz)} size="sm" variant="outline">
                          <Play className="h-4 w-4 mr-1" /> Take Exam
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No practice exams available yet.</p>
                  </div>
                )}
              </TabsContent>

              {/* SLIDES & EXAMPLES - placeholder */}
              {["slides", "examples"].map((id) => (
                <TabsContent key={id} value={id} className="mt-6">
                  <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
                    {id === "slides" ? <Presentation className="h-10 w-10 text-muted-foreground/50 mb-4" /> : <Lightbulb className="h-10 w-10 text-muted-foreground/50 mb-4" />}
                    <p className="text-muted-foreground">Content coming soon.</p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default SubjectDetail;
