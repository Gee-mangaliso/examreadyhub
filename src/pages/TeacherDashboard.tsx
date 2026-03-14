import { useState, useEffect } from "react";
import { Users, BookOpen, Activity, Send, Plus, Clock, CheckCircle, XCircle, Trash2, GraduationCap, FileText, Loader2, ClipboardList, Lock } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  student_id: string;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null; grade: string | null };
}

interface Invite {
  id: string;
  student_email: string | null;
  student_phone: string | null;
  status: string;
  created_at: string;
}

interface TeacherContentItem {
  id: string;
  title: string;
  content: string | null;
  content_type: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  due_date: string | null;
  lockdown_required: boolean;
  quiz_id: string | null;
  created_at: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [content, setContent] = useState<TeacherContentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteSending, setInviteSending] = useState(false);

  // Content form
  const [contentOpen, setContentOpen] = useState(false);
  const [contentTitle, setContentTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [contentType, setContentType] = useState("note");
  const [contentSaving, setContentSaving] = useState(false);

  // Activity form
  const [activityOpen, setActivityOpen] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actType, setActType] = useState("general");
  const [actDue, setActDue] = useState("");
  const [actLockdown, setActLockdown] = useState(false);
  const [actSaving, setActSaving] = useState(false);

  // Quiz creation
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [quizTimeLimit, setQuizTimeLimit] = useState("");
  const [quizSubjectId, setQuizSubjectId] = useState("");
  const [quizLockdown, setQuizLockdown] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { question: "", options: ["", "", "", ""], correct_answer: "", explanation: "" },
  ]);
  const [quizSaving, setQuizSaving] = useState(false);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [studentsRes, invitesRes, contentRes, activitiesRes, subjectsRes] = await Promise.all([
        supabase.from("teacher_students").select("id, student_id, created_at").eq("teacher_id", user.id),
        supabase.from("teacher_invites").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
        supabase.from("teacher_content").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
        supabase.from("teacher_activities").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
        supabase.from("subjects").select("id, name").order("name"),
      ]);

      const studentIds = (studentsRes.data || []).map((s: any) => s.student_id);
      let profiles: any[] = [];
      if (studentIds.length > 0) {
        const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url, grade").in("user_id", studentIds);
        profiles = p || [];
      }

      setStudents((studentsRes.data || []).map((s: any) => ({
        ...s,
        profile: profiles.find((p: any) => p.user_id === s.student_id),
      })));
      setInvites((invitesRes.data || []) as Invite[]);
      setContent((contentRes.data || []) as TeacherContentItem[]);
      setActivities((activitiesRes.data || []) as ActivityItem[]);
      setSubjects((subjectsRes.data || []) as { id: string; name: string }[]);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const sendInvite = async () => {
    if (!inviteEmail && !invitePhone) {
      toast({ title: "Enter email or phone number", variant: "destructive" });
      return;
    }
    setInviteSending(true);
    const { error } = await supabase.from("teacher_invites").insert({
      teacher_id: user!.id,
      student_email: inviteEmail || null,
      student_phone: invitePhone || null,
      message: inviteMsg || null,
    });
    setInviteSending(false);
    if (error) {
      toast({ title: "Failed to send invite", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite sent!" });
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePhone("");
      setInviteMsg("");
      const { data } = await supabase.from("teacher_invites").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false });
      setInvites((data || []) as Invite[]);
    }
  };

  const createContent = async () => {
    if (!contentTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setContentSaving(true);
    const { error } = await supabase.from("teacher_content").insert({
      teacher_id: user!.id,
      title: contentTitle,
      content: contentBody || null,
      content_type: contentType,
    });
    setContentSaving(false);
    if (error) {
      toast({ title: "Failed to create content", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Content created!" });
      setContentOpen(false);
      setContentTitle("");
      setContentBody("");
      const { data } = await supabase.from("teacher_content").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false });
      setContent((data || []) as TeacherContentItem[]);
    }
  };

  const createActivity = async () => {
    if (!actTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setActSaving(true);
    const { error } = await supabase.from("teacher_activities").insert({
      teacher_id: user!.id,
      title: actTitle,
      description: actDesc || null,
      activity_type: actType,
      due_date: actDue || null,
      lockdown_required: actLockdown,
    });
    setActSaving(false);
    if (error) {
      toast({ title: "Failed to create activity", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Activity created!" });
      setActivityOpen(false);
      setActTitle("");
      setActDesc("");
      const { data } = await supabase.from("teacher_activities").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false });
      setActivities((data || []) as ActivityItem[]);
    }
  };

  const createQuiz = async () => {
    if (!quizTitle.trim() || !quizSubjectId) {
      toast({ title: "Title and subject are required", variant: "destructive" });
      return;
    }
    const validQuestions = quizQuestions.filter(q => q.question.trim() && q.correct_answer.trim());
    if (validQuestions.length === 0) {
      toast({ title: "Add at least one question", variant: "destructive" });
      return;
    }

    setQuizSaving(true);

    // 1. Create the quiz
    const { data: quizData, error: quizError } = await supabase.from("quizzes").insert({
      title: quizTitle,
      description: quizDesc || null,
      subject_id: quizSubjectId,
      time_limit_minutes: quizTimeLimit ? parseInt(quizTimeLimit) : null,
      type: "quiz",
    }).select("id").single();

    if (quizError || !quizData) {
      toast({ title: "Failed to create quiz", description: quizError?.message, variant: "destructive" });
      setQuizSaving(false);
      return;
    }

    // 2. Insert questions
    const questionsToInsert = validQuestions.map((q, i) => ({
      quiz_id: quizData.id,
      question: q.question,
      options: q.options.filter(o => o.trim()),
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      sort_order: i,
    }));

    const { error: qError } = await supabase.from("quiz_questions").insert(questionsToInsert);
    if (qError) {
      toast({ title: "Quiz created but questions failed", description: qError.message, variant: "destructive" });
      setQuizSaving(false);
      return;
    }

    // 3. Optionally create activity with lockdown
    if (quizLockdown) {
      await supabase.from("teacher_activities").insert({
        teacher_id: user!.id,
        title: `Lockdown Exam: ${quizTitle}`,
        description: quizDesc || null,
        activity_type: "quiz",
        quiz_id: quizData.id,
        lockdown_required: true,
      });
      const { data: actData } = await supabase.from("teacher_activities").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false });
      setActivities((actData || []) as ActivityItem[]);
    }

    toast({ title: "Quiz created!", description: `${validQuestions.length} questions added${quizLockdown ? " (lockdown exam)" : ""}` });
    setQuizOpen(false);
    setQuizTitle("");
    setQuizDesc("");
    setQuizTimeLimit("");
    setQuizSubjectId("");
    setQuizLockdown(false);
    setQuizQuestions([{ question: "", options: ["", "", "", ""], correct_answer: "", explanation: "" }]);
    setQuizSaving(false);
  };

  const addQuestion = () => {
    setQuizQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correct_answer: "", explanation: "" }]);
  };

  const updateQuestion = (idx: number, field: keyof QuizQuestion, value: any) => {
    setQuizQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuizQuestions(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q
    ));
  };

  const removeQuestion = (idx: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const deleteInvite = async (id: string) => {
    await supabase.from("teacher_invites").delete().eq("id", id);
    setInvites((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Invite removed" });
  };

  const deleteContent = async (id: string) => {
    await supabase.from("teacher_content").delete().eq("id", id);
    setContent((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Content deleted" });
  };

  const deleteActivity = async (id: string) => {
    await supabase.from("teacher_activities").delete().eq("id", id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Activity deleted" });
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
        <main className="flex-1 py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-heading text-foreground">Teacher Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your students, content, quizzes, and activities</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Students</span></div>
                <span className="text-2xl font-bold text-foreground">{students.length}</span>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1"><Send className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Invites</span></div>
                <span className="text-2xl font-bold text-foreground">{invites.filter((i) => i.status === "pending").length}</span>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1"><BookOpen className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Content</span></div>
                <span className="text-2xl font-bold text-foreground">{content.length}</span>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Activities</span></div>
                <span className="text-2xl font-bold text-foreground">{activities.length}</span>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
                <TabsTrigger value="students"><Users className="h-4 w-4 mr-1" />Students</TabsTrigger>
                <TabsTrigger value="invites"><Send className="h-4 w-4 mr-1" />Invites</TabsTrigger>
                <TabsTrigger value="content"><BookOpen className="h-4 w-4 mr-1" />Content</TabsTrigger>
                <TabsTrigger value="quizzes"><ClipboardList className="h-4 w-4 mr-1" />Quizzes</TabsTrigger>
                <TabsTrigger value="activities"><Activity className="h-4 w-4 mr-1" />Activities</TabsTrigger>
              </TabsList>

              {/* Students Tab */}
              <TabsContent value="students" className="space-y-4">
                {students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No students yet. Send invites to get started.</p>
                    <Button className="mt-4" onClick={() => { setActiveTab("invites"); setInviteOpen(true); }}>
                      <Send className="h-4 w-4 mr-2" />Invite Students
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {students.map((s) => (
                      <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {(s.profile?.full_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{s.profile?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{s.profile?.grade || "No grade"} · Joined {format(new Date(s.created_at), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                        <Badge variant="secondary"><GraduationCap className="h-3 w-3 mr-1" />Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Invites Tab */}
              <TabsContent value="invites" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4 mr-2" />Send Invite</Button>
                </div>
                {invites.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No invites sent yet.</div>
                ) : (
                  <div className="space-y-3">
                    {invites.map((inv) => (
                      <div key={inv.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{inv.student_email || inv.student_phone}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={inv.status === "accepted" ? "default" : inv.status === "declined" ? "destructive" : "secondary"}>
                            {inv.status === "accepted" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {inv.status === "declined" && <XCircle className="h-3 w-3 mr-1" />}
                            {inv.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {inv.status}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => deleteInvite(inv.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setContentOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Content</Button>
                </div>
                {content.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No content created yet.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {content.map((c) => (
                      <div key={c.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-1">{c.content_type}</Badge>
                            <h3 className="font-medium text-foreground">{c.title}</h3>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteContent(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        {c.content && <p className="text-sm text-muted-foreground line-clamp-2">{c.content}</p>}
                        <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Quizzes Tab */}
              <TabsContent value="quizzes" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setQuizOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Quiz</Button>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Create quizzes and assign them as lockdown exams for your students.</p>
                </div>
              </TabsContent>

              {/* Activities Tab */}
              <TabsContent value="activities" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setActivityOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Activity</Button>
                </div>
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No activities created yet.</div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((a) => (
                      <div key={a.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{a.title}</h3>
                            {a.lockdown_required && <Badge variant="destructive" className="text-xs"><Lock className="h-3 w-3 mr-1" />Lockdown</Badge>}
                          </div>
                          {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline">{a.activity_type}</Badge>
                            {a.due_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {format(new Date(a.due_date), "MMM d, yyyy")}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteActivity(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Student</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Student Email</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Or Phone Number</Label>
              <Input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+27..." />
            </div>
            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} placeholder="Join my class..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={sendInvite} disabled={inviteSending}>
              {inviteSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Dialog */}
      <Dialog open={contentOpen} onOpenChange={setContentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Content</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="study_guide">Study Guide</SelectItem>
                  <SelectItem value="worked_example">Worked Example</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} placeholder="Content title" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={contentBody} onChange={(e) => setContentBody(e.target.value)} placeholder="Write content here..." rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createContent} disabled={contentSaving}>
              {contentSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Daily Activity</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="Activity title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={actDesc} onChange={(e) => setActDesc(e.target.value)} placeholder="Describe the activity..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={actType} onValueChange={setActType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={actDue} onChange={(e) => setActDue(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={actLockdown} onCheckedChange={setActLockdown} />
              <Label>Require lockdown browser</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createActivity} disabled={actSaving}>
              {actSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Creation Dialog */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />Create Quiz
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Quiz details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Quiz Title</Label>
                <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="e.g. Chapter 5 Assessment" />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={quizSubjectId} onValueChange={setQuizSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input type="number" value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description (optional)</Label>
                <Textarea value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} placeholder="Quiz instructions..." rows={2} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={quizLockdown} onCheckedChange={setQuizLockdown} />
                <div>
                  <Label className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />Assign as lockdown exam
                  </Label>
                  <p className="text-xs text-muted-foreground">Students must complete in lockdown browser with webcam</p>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Questions ({quizQuestions.length})</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-1" />Add Question
                </Button>
              </div>

              {quizQuestions.map((q, qIdx) => (
                <div key={qIdx} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Question {qIdx + 1}</span>
                    {quizQuestions.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Enter question..."
                    value={q.question}
                    onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <Input
                        key={oIdx}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        value={opt}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Correct Answer</Label>
                      <Select value={q.correct_answer} onValueChange={(v) => updateQuestion(qIdx, "correct_answer", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {q.options.filter(o => o.trim()).map((o, i) => (
                            <SelectItem key={i} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Explanation (optional)</Label>
                      <Input
                        placeholder="Why this is correct..."
                        value={q.explanation}
                        onChange={(e) => updateQuestion(qIdx, "explanation", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createQuiz} disabled={quizSaving} className="gap-2">
              {quizSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Create Quiz{quizLockdown ? " (Lockdown)" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default TeacherDashboard;
