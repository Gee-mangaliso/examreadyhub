import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Save, X, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Grade { id: string; name: string }
interface Subject { id: string; name: string; grade_id: string }
interface Quiz {
  id: string; title: string; description: string | null;
  subject_id: string; time_limit_minutes: number | null; created_at: string;
  subjects?: { name: string; grade_id: string };
}
interface Question {
  id: string; question: string; options: string[];
  correct_answer: string; explanation: string | null;
  sort_order: number; quiz_id: string;
}

const QuizManager = () => {
  const { toast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");

  // Quiz form
  const [quizDialog, setQuizDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({ title: "", description: "", subject_id: "", time_limit_minutes: "" });

  // Questions
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionDialog, setQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qForm, setQForm] = useState({
    question: "", options: ["", "", "", ""], correct_answer: "", explanation: "",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("grades").select("id, name").order("sort_order"),
      supabase.from("subjects").select("id, name, grade_id"),
      supabase.from("quizzes").select("*, subjects(name, grade_id)").order("created_at", { ascending: false }),
    ]).then(([g, s, q]) => {
      setGrades(g.data || []);
      setSubjects(s.data || []);
      setQuizzes((q.data || []) as Quiz[]);
      setLoading(false);
    });
  }, []);

  const filteredSubjects = filterGrade === "all" ? subjects : subjects.filter(s => s.grade_id === filterGrade);
  const filteredQuizzes = quizzes.filter(q => {
    if (filterSubject !== "all" && q.subject_id !== filterSubject) return false;
    if (filterGrade !== "all" && q.subjects?.grade_id !== filterGrade) return false;
    return true;
  });

  const openNewQuiz = () => {
    setEditingQuiz(null);
    setQuizForm({ title: "", description: "", subject_id: "", time_limit_minutes: "" });
    setQuizDialog(true);
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      description: quiz.description || "",
      subject_id: quiz.subject_id,
      time_limit_minutes: quiz.time_limit_minutes?.toString() || "",
    });
    setQuizDialog(true);
  };

  const saveQuiz = async () => {
    if (!quizForm.title || !quizForm.subject_id) {
      toast({ title: "Title and subject are required", variant: "destructive" });
      return;
    }
    const payload = {
      title: quizForm.title,
      description: quizForm.description || null,
      subject_id: quizForm.subject_id,
      time_limit_minutes: quizForm.time_limit_minutes ? parseInt(quizForm.time_limit_minutes) : null,
    };

    if (editingQuiz) {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", editingQuiz.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      // Refresh
      const { data } = await supabase.from("quizzes").select("*, subjects(name, grade_id)").eq("id", editingQuiz.id).single();
      setQuizzes(prev => prev.map(q => q.id === editingQuiz.id ? (data as Quiz) : q));
    } else {
      const { data, error } = await supabase.from("quizzes").insert(payload).select("*, subjects(name, grade_id)").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setQuizzes(prev => [(data as Quiz), ...prev]);
    }
    toast({ title: editingQuiz ? "Quiz updated" : "Quiz created" });
    setQuizDialog(false);
  };

  const deleteQuiz = async (id: string) => {
    // Delete questions first, then quiz
    await supabase.from("quiz_questions").delete().eq("quiz_id", id);
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setQuizzes(prev => prev.filter(q => q.id !== id));
    if (expandedQuiz === id) setExpandedQuiz(null);
    toast({ title: "Quiz deleted" });
  };

  const toggleQuestions = async (quizId: string) => {
    if (expandedQuiz === quizId) { setExpandedQuiz(null); return; }
    setExpandedQuiz(quizId);
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    setQuestions((data || []) as Question[]);
  };

  const openNewQuestion = () => {
    setEditingQuestion(null);
    setQForm({ question: "", options: ["", "", "", ""], correct_answer: "", explanation: "" });
    setQuestionDialog(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    const opts = Array.isArray(q.options) ? q.options as string[] : ["", "", "", ""];
    setQForm({
      question: q.question,
      options: [...opts, "", "", "", ""].slice(0, 4),
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
    });
    setQuestionDialog(true);
  };

  const saveQuestion = async () => {
    if (!qForm.question || !qForm.correct_answer || !expandedQuiz) {
      toast({ title: "Question and correct answer required", variant: "destructive" });
      return;
    }
    const validOptions = qForm.options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast({ title: "At least 2 options required", variant: "destructive" });
      return;
    }
    const payload = {
      quiz_id: expandedQuiz,
      question: qForm.question,
      options: validOptions,
      correct_answer: qForm.correct_answer,
      explanation: qForm.explanation || null,
      sort_order: editingQuestion?.sort_order ?? questions.length,
    };

    if (editingQuestion) {
      const { error } = await supabase.from("quiz_questions").update(payload).eq("id", editingQuestion.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("quiz_questions").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }
    // Refresh questions
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", expandedQuiz).order("sort_order");
    setQuestions((data || []) as Question[]);
    toast({ title: editingQuestion ? "Question updated" : "Question added" });
    setQuestionDialog(false);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    toast({ title: "Question deleted" });
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading quizzes…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-heading text-foreground">Quiz Management</h2>
        <Button onClick={openNewQuiz} className="gap-1.5">
          <Plus className="h-4 w-4" /> Create Quiz
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterGrade} onValueChange={(v) => { setFilterGrade(v); setFilterSubject("all"); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Quizzes list */}
      <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
        {filteredQuizzes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No quizzes found. Create one to get started.</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredQuizzes.map(quiz => (
              <div key={quiz.id}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <button onClick={() => toggleQuestions(quiz.id)} className="text-muted-foreground hover:text-foreground">
                    {expandedQuiz === quiz.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{quiz.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {quiz.subjects?.name}
                      {quiz.time_limit_minutes && <span className="ml-2">• {quiz.time_limit_minutes} min</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEditQuiz(quiz)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteQuiz(quiz.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded questions */}
                {expandedQuiz === quiz.id && (
                  <div className="bg-muted/30 border-t border-border px-6 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Questions ({questions.length})</span>
                      <Button size="sm" variant="outline" onClick={openNewQuestion} className="gap-1">
                        <Plus className="h-3 w-3" /> Add Question
                      </Button>
                    </div>
                    {questions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No questions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {questions.map((q, i) => (
                          <div key={q.id} className="bg-card border border-border rounded-md p-3 flex items-start gap-3">
                            <span className="text-xs text-muted-foreground font-mono mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{q.question}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(Array.isArray(q.options) ? q.options as string[] : []).map((opt, j) => (
                                  <Badge key={j} variant={opt === q.correct_answer ? "default" : "secondary"} className="text-xs">
                                    {opt}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditQuestion(q)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteQuestion(q.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz Dialog */}
      <Dialog open={quizDialog} onOpenChange={setQuizDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuiz ? "Edit Quiz" : "Create Quiz"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={quizForm.description} onChange={e => setQuizForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={quizForm.subject_id} onValueChange={v => setQuizForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => {
                    const g = grades.find(g => g.id === s.grade_id);
                    return <SelectItem key={s.id} value={s.id}>{g?.name} — {s.name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Time Limit (minutes, optional)</Label>
              <Input type="number" value={quizForm.time_limit_minutes} onChange={e => setQuizForm(p => ({ ...p, time_limit_minutes: e.target.value }))} />
            </div>
            <Button onClick={saveQuiz} className="w-full">
              <Save className="h-4 w-4 mr-1" /> {editingQuiz ? "Update Quiz" : "Create Quiz"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialog} onOpenChange={setQuestionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea value={qForm.question} onChange={e => setQForm(p => ({ ...p, question: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {qForm.options.map((opt, i) => (
                <Input
                  key={i}
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => {
                    const newOpts = [...qForm.options];
                    newOpts[i] = e.target.value;
                    setQForm(p => ({ ...p, options: newOpts }));
                  }}
                />
              ))}
            </div>
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <Select value={qForm.correct_answer} onValueChange={v => setQForm(p => ({ ...p, correct_answer: v }))}>
                <SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                <SelectContent>
                  {qForm.options.filter(o => o.trim()).map((opt, i) => (
                    <SelectItem key={i} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Explanation (optional)</Label>
              <Textarea value={qForm.explanation} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} />
            </div>
            <Button onClick={saveQuestion} className="w-full">
              <Save className="h-4 w-4 mr-1" /> {editingQuestion ? "Update" : "Add"} Question
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizManager;
