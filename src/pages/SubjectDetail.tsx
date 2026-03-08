import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  Lock, FileText, Presentation, Lightbulb, HelpCircle, ClipboardList,
  BookOpen, Play, Loader2, Download, ExternalLink, BookMarked, GraduationCap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import QuizPlayer from "@/components/QuizPlayer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const getSections = (loggedIn: boolean) => [
  { id: "notes", label: "Notes", icon: FileText, locked: false },
  { id: "slides", label: "Slides", icon: Presentation, locked: false },
  { id: "examples", label: "Worked Examples", icon: Lightbulb, locked: false },
  { id: "textbooks", label: "Textbooks", icon: BookMarked, locked: false },
  { id: "study-guides", label: "Study Guides", icon: GraduationCap, locked: false },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle, locked: !loggedIn },
  { id: "exams", label: "Practice Exams", icon: ClipboardList, locked: !loggedIn },
];

interface Note { id: string; title: string; content: string | null; sort_order: number }
interface Slide { id: string; title: string; content: string | null; file_url: string | null; sort_order: number }
interface WorkedExample { id: string; title: string; content: string | null; file_url: string | null; sort_order: number }
interface Textbook { id: string; title: string; description: string | null; file_url: string | null; sort_order: number }
interface StudyGuide { id: string; title: string; content: string | null; file_url: string | null; sort_order: number }
interface Quiz { id: string; title: string; description: string | null; time_limit_minutes: number | null; type: string }
interface QuizQuestion { id: string; question: string; options: string[]; correct_answer: string; explanation: string | null; sort_order: number }

const SubjectDetail = () => {
  const { grade, subject } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const subjectName = decodeURIComponent(subject || "");
  const sections = getSections(!!user);
  const defaultTab = searchParams.get("tab") || "notes";

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [examples, setExamples] = useState<WorkedExample[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [studyGuides, setStudyGuides] = useState<StudyGuide[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [exams, setExams] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [expandedExample, setExpandedExample] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubject = async () => {
      const { data: gradeData } = await supabase.from("grades").select("id").eq("name", `Grade ${grade}`).maybeSingle();
      if (!gradeData) { setLoading(false); return; }
      const { data: subjectData } = await supabase.from("subjects").select("id").eq("grade_id", gradeData.id).eq("name", subjectName).maybeSingle();
      if (subjectData) setSubjectId(subjectData.id);
      setLoading(false);
    };
    fetchSubject();
  }, [grade, subjectName]);

  useEffect(() => {
    if (!subjectId) return;
    const fetchContent = async () => {
      const [notesRes, slidesRes, examplesRes, textbooksRes, guidesRes, quizzesRes, examsRes] = await Promise.all([
        supabase.from("notes").select("*").eq("subject_id", subjectId).order("sort_order"),
        supabase.from("slides").select("*").eq("subject_id", subjectId).order("sort_order"),
        supabase.from("worked_examples").select("*").eq("subject_id", subjectId).order("sort_order"),
        supabase.from("textbooks").select("*").eq("subject_id", subjectId).order("sort_order"),
        supabase.from("study_guides").select("*").eq("subject_id", subjectId).order("sort_order"),
        supabase.from("quizzes").select("*").eq("subject_id", subjectId).eq("type", "quiz").order("created_at"),
        supabase.from("quizzes").select("*").eq("subject_id", subjectId).eq("type", "exam").order("created_at"),
      ]);
      if (notesRes.data) setNotes(notesRes.data);
      if (slidesRes.data) setSlides(slidesRes.data);
      if (examplesRes.data) setExamples(examplesRes.data);
      if (textbooksRes.data) setTextbooks(textbooksRes.data as any);
      if (guidesRes.data) setStudyGuides(guidesRes.data as any);
      if (quizzesRes.data) setQuizzes(quizzesRes.data);
      if (examsRes.data) setExams(examsRes.data);
    };
    fetchContent();
  }, [subjectId]);

  const startQuiz = async (quiz: Quiz) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("sort_order");
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
          <main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
        </div>
      </PageTransition>
    );
  }

  const renderMarkdown = (content: string) =>
    content.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h4 key={i} className="text-base font-semibold mt-4 mb-2 text-foreground">{line.slice(4)}</h4>;
      if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-foreground">{line.slice(3)}</h3>;
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
      if (line.startsWith("|")) return <p key={i} className="text-muted-foreground font-mono text-xs">{line}</p>;
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-muted-foreground">{line}</p>;
    });

  const LockedContent = ({ type }: { type: string }) => (
    <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
      <Lock className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-muted-foreground font-medium">Please log in to access {type}.</p>
      <Link to="/login" className="mt-4 text-primary hover:underline text-sm">Go to Login →</Link>
    </div>
  );

  const EmptyContent = ({ icon: Icon, message }: { icon: any; message: string }) => (
    <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

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

            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1 rounded-lg">
                {sections.map((s) => (
                  <TabsTrigger key={s.id} value={s.id} className="flex items-center gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-card">
                    <s.icon className="h-4 w-4" />
                    {s.label}
                    {s.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* NOTES */}
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
                            {renderMarkdown(note.content)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyContent icon={FileText} message="No notes available yet." />
                )}
              </TabsContent>

              {/* SLIDES */}
              <TabsContent value="slides" className="mt-6">
                {slides.length > 0 ? (
                  <div className="space-y-4">
                    {slides.map((slide) => (
                      <div key={slide.id} className="bg-card border border-border rounded-lg p-6 shadow-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Presentation className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <h3 className="font-medium text-foreground">{slide.title}</h3>
                              {slide.content && <p className="text-sm text-muted-foreground mt-1">{slide.content.slice(0, 200)}</p>}
                            </div>
                          </div>
                          {slide.file_url && (
                            <Button asChild size="sm" variant="outline">
                              <a href={slide.file_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" /> View
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyContent icon={Presentation} message="No slides available yet." />
                )}
              </TabsContent>

              {/* WORKED EXAMPLES */}
              <TabsContent value="examples" className="mt-6">
                {examples.length > 0 ? (
                  <div className="space-y-4">
                    {examples.map((ex) => (
                      <div key={ex.id} className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
                        <button
                          onClick={() => setExpandedExample(expandedExample === ex.id ? null : ex.id)}
                          className="w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <Lightbulb className="h-5 w-5 text-primary shrink-0" />
                          <span className="font-medium text-foreground">{ex.title}</span>
                          {ex.file_url && <Badge variant="secondary" className="text-xs ml-auto">File attached</Badge>}
                        </button>
                        {expandedExample === ex.id && (
                          <div className="px-6 pb-6 border-t border-border pt-4">
                            {ex.content && <div className="prose prose-sm max-w-none text-foreground mb-4">{renderMarkdown(ex.content)}</div>}
                            {ex.file_url && (
                              <Button asChild size="sm" variant="outline">
                                <a href={ex.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-1" /> Download File
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyContent icon={Lightbulb} message="No worked examples available yet." />
                )}
              </TabsContent>

              {/* TEXTBOOKS */}
              <TabsContent value="textbooks" className="mt-6">
                {textbooks.length > 0 ? (
                  <div className="space-y-4">
                    {textbooks.map((tb) => (
                      <div key={tb.id} className="bg-card border border-border rounded-lg p-6 shadow-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <BookMarked className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <h3 className="font-medium text-foreground">{tb.title}</h3>
                              {tb.description && <p className="text-sm text-muted-foreground mt-1">{tb.description}</p>}
                            </div>
                          </div>
                          {tb.file_url && (
                            <Button asChild size="sm" variant="outline">
                              <a href={tb.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" /> Download
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyContent icon={BookMarked} message="No textbooks available yet." />
                )}
              </TabsContent>

              {/* STUDY GUIDES */}
              <TabsContent value="study-guides" className="mt-6">
                {studyGuides.length > 0 ? (
                  <div className="space-y-4">
                    {studyGuides.map((guide) => (
                      <div key={guide.id} className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
                        <div className="px-6 py-4 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <h3 className="font-medium text-foreground">{guide.title}</h3>
                              {guide.content && (
                                <div className="mt-3 prose prose-sm max-w-none text-foreground">
                                  {renderMarkdown(guide.content)}
                                </div>
                              )}
                            </div>
                          </div>
                          {guide.file_url && (
                            <Button asChild size="sm" variant="outline" className="shrink-0">
                              <a href={guide.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-1" /> Download
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyContent icon={GraduationCap} message="No study guides available yet." />
                )}
              </TabsContent>

              {/* QUIZZES */}
              <TabsContent value="quizzes" className="mt-6">
                {sections.find((s) => s.id === "quizzes")?.locked ? (
                  <LockedContent type="quizzes" />
                ) : activeQuiz && activeQuiz.type !== "exam" ? (
                  <QuizPlayer quiz={activeQuiz} questions={quizQuestions} onBack={() => setActiveQuiz(null)} />
                ) : quizzes.length > 0 ? (
                  <div className="space-y-4">
                    {quizzes.map((quiz) => (
                      <div key={quiz.id} className="bg-card border border-border rounded-lg p-6 shadow-card flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{quiz.title}</h3>
                          {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
                          {quiz.time_limit_minutes && <span className="text-xs text-muted-foreground mt-2 inline-block">⏱ {quiz.time_limit_minutes} min</span>}
                        </div>
                        <Button onClick={() => startQuiz(quiz)} size="sm"><Play className="h-4 w-4 mr-1" /> Start</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyContent icon={HelpCircle} message="No quizzes available yet." />
                )}
              </TabsContent>

              {/* PRACTICE EXAMS */}
              <TabsContent value="exams" className="mt-6">
                {sections.find((s) => s.id === "exams")?.locked ? (
                  <LockedContent type="practice exams" />
                ) : activeQuiz && activeQuiz.type === "exam" ? (
                  <QuizPlayer quiz={activeQuiz} questions={quizQuestions} onBack={() => setActiveQuiz(null)} />
                ) : exams.length > 0 ? (
                  <div className="space-y-4">
                    {exams.map((exam) => (
                      <div key={exam.id} className="bg-card border border-border rounded-lg p-6 shadow-card flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{exam.title}</h3>
                          {exam.description && <p className="text-sm text-muted-foreground mt-1">{exam.description}</p>}
                          {exam.time_limit_minutes && <span className="text-xs text-muted-foreground mt-2 inline-block">⏱ {exam.time_limit_minutes} min</span>}
                        </div>
                        <Button onClick={() => startQuiz(exam)} size="sm" variant="outline">
                          <Play className="h-4 w-4 mr-1" /> Take Exam
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyContent icon={ClipboardList} message="No practice exams available yet." />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default SubjectDetail;
