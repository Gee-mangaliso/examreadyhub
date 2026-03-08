import { useState, useEffect } from "react";
import {
  Users, BarChart3, TrendingUp, Activity, Eye, Search,
  ChevronLeft, GraduationCap, Clock, Award, BookOpen, FolderOpen, Sparkles, SearchIcon, FileText,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import ContentManager from "@/components/admin/ContentManager";
import BadgeManager from "@/components/admin/BadgeManager";
import SuggestionManager from "@/components/admin/SuggestionManager";
import SuggestionHistory from "@/components/admin/SuggestionHistory";
import SearchAnalytics from "@/components/admin/SearchAnalytics";
import MemoRequestManager from "@/components/admin/MemoRequestManager";
import FeedbackManager from "@/components/admin/FeedbackManager";
import TestimonialManager from "@/components/admin/TestimonialManager";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  user_id: string; full_name: string; email: string; avatar_url: string | null;
  grade: string | null; created_at: string; total_quizzes_taken: number;
  total_score: number; total_questions: number; avg_percentage: number;
  last_quiz_at: string | null; subjects_enrolled: number;
}
interface PlatformStats {
  total_students: number; total_quiz_attempts: number; avg_score: number;
  active_today: number; active_this_week: number;
}
interface StudentAttempt {
  attempt_id: string; quiz_title: string; subject_name: string; grade_name: string;
  score: number; total_questions: number; percentage: number; completed_at: string;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) => (
  <div className="bg-card border border-border rounded-lg p-5 shadow-card">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <div className="text-2xl font-bold text-foreground">{value}</div>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Activity guide stats
  const [guideCounts, setGuideCounts] = useState({ subjects: 0, newStudents: 0, badges: 0, pendingFeedback: 0, pendingMemos: 0, pendingTestimonials: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const [studentsRes, statsRes, subjectsRes, feedbackRes, memosRes, testimonialsRes, badgesRes] = await Promise.all([
        supabase.rpc("admin_get_all_students"),
        supabase.rpc("admin_get_platform_stats"),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("feedback").select("id", { count: "exact", head: true }),
        supabase.from("memo_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("approved", false),
        supabase.from("badges").select("id", { count: "exact", head: true }),
      ]);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      if (statsRes.data && (statsRes.data as PlatformStats[]).length > 0)
        setStats((statsRes.data as PlatformStats[])[0]);

      const allStudents = studentsRes.data as Student[] || [];
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const newStudents = allStudents.filter(s => new Date(s.created_at) >= weekAgo).length;

      setGuideCounts({
        subjects: subjectsRes.count || 0,
        newStudents,
        badges: badgesRes.count || 0,
        pendingFeedback: feedbackRes.count || 0,
        pendingMemos: memosRes.count || 0,
        pendingTestimonials: testimonialsRes.count || 0,
      });
      setLoading(false);
    };
    fetchData();
  }, []);

  const viewStudent = async (student: Student) => {
    setSelectedStudent(student);
    setAttemptsLoading(true);
    const { data } = await supabase.rpc("admin_get_student_attempts", { _student_id: student.user_id });
    if (data) setAttempts(data as StudentAttempt[]);
    setAttemptsLoading(false);
  };

  const filtered = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.grade || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </main>
        </div>
      </PageTransition>
    );
  }

  if (selectedStudent) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 py-16 px-4">
            <div className="max-w-5xl mx-auto">
              <Button variant="ghost" onClick={() => { setSelectedStudent(null); setAttempts([]); }} className="mb-6 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Students
              </Button>
              <div className="bg-card border border-border rounded-lg p-6 shadow-card mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedStudent.avatar_url || undefined} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">{getInitials(selectedStudent.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-2xl font-heading text-foreground">{selectedStudent.full_name}</h2>
                    <p className="text-muted-foreground">{selectedStudent.email}</p>
                    <div className="flex gap-3 mt-2">
                      {selectedStudent.grade && <Badge variant="secondary"><GraduationCap className="h-3 w-3 mr-1" />{selectedStudent.grade}</Badge>}
                      <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Joined {format(new Date(selectedStudent.created_at), "MMM d, yyyy")}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard icon={BarChart3} label="Quizzes Taken" value={selectedStudent.total_quizzes_taken} />
                <StatCard icon={Award} label="Total Score" value={`${selectedStudent.total_score}/${selectedStudent.total_questions}`} />
                <StatCard icon={TrendingUp} label="Avg Score" value={`${selectedStudent.avg_percentage}%`} />
                <StatCard icon={BookOpen} label="Subjects" value={selectedStudent.subjects_enrolled} />
              </div>
              <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border"><h3 className="font-heading text-lg text-foreground">Quiz History</h3></div>
                {attemptsLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading attempts…</div>
                ) : attempts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No quiz attempts yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz</TableHead><TableHead>Subject</TableHead><TableHead>Grade</TableHead>
                        <TableHead className="text-center">Score</TableHead><TableHead className="text-center">%</TableHead><TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.map((a) => (
                        <TableRow key={a.attempt_id}>
                          <TableCell className="font-medium text-foreground">{a.quiz_title}</TableCell>
                          <TableCell className="text-muted-foreground">{a.subject_name}</TableCell>
                          <TableCell className="text-muted-foreground">{a.grade_name}</TableCell>
                          <TableCell className="text-center text-foreground">{a.score}/{a.total_questions}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-foreground font-medium">{a.percentage}%</span>
                              <Progress value={a.percentage} className="h-1.5 w-16" />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{format(new Date(a.completed_at), "MMM d, yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
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
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-heading text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage content, students, and badges</p>
            </div>

            {/* Admin Activity Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-lg p-4 shadow-card space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10"><FolderOpen className="h-5 w-5 text-primary" /></div>
                  <h3 className="font-heading text-sm text-foreground">Manage Content</h3>
                </div>
                <p className="text-xs text-muted-foreground">Add or edit subjects, notes, slides, study guides, textbooks, worked examples, quizzes, and exam papers.</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                  <h3 className="font-heading text-sm text-foreground">Monitor Students</h3>
                </div>
                <p className="text-xs text-muted-foreground">View student registrations, quiz performance, and identify learners who may need extra support.</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10"><Award className="h-5 w-5 text-primary" /></div>
                  <h3 className="font-heading text-sm text-foreground">Award Badges</h3>
                </div>
                <p className="text-xs text-muted-foreground">Create badges and award them to top-performing learners to boost motivation and engagement.</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10"><Activity className="h-5 w-5 text-primary" /></div>
                  <h3 className="font-heading text-sm text-foreground">Review Feedback</h3>
                </div>
                <p className="text-xs text-muted-foreground">Read student feedback, approve testimonials, respond to memo requests, and send study suggestions.</p>
              </div>
            </div>

            <Tabs defaultValue="content" className="space-y-6">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="content" className="gap-1.5"><FolderOpen className="h-4 w-4" />Content</TabsTrigger>
                <TabsTrigger value="students" className="gap-1.5"><Users className="h-4 w-4" />Students</TabsTrigger>
                <TabsTrigger value="suggestions" className="gap-1.5"><Sparkles className="h-4 w-4" />Suggestions</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5"><Search className="h-4 w-4" />Search Analytics</TabsTrigger>
                <TabsTrigger value="badges" className="gap-1.5"><Award className="h-4 w-4" />Badges</TabsTrigger>
                <TabsTrigger value="memos" className="gap-1.5"><FileText className="h-4 w-4" />Memo Requests</TabsTrigger>
                <TabsTrigger value="feedback" className="gap-1.5"><Activity className="h-4 w-4" />Feedback</TabsTrigger>
                <TabsTrigger value="testimonials" className="gap-1.5"><Eye className="h-4 w-4" />Testimonials</TabsTrigger>
              </TabsList>

              <TabsContent value="content">
                <ContentManager />
              </TabsContent>

              <TabsContent value="students" className="space-y-6">
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    <StatCard icon={Users} label="Total Students" value={stats.total_students} />
                    <StatCard icon={BarChart3} label="Quiz Attempts" value={stats.total_quiz_attempts} />
                    <StatCard icon={TrendingUp} label="Avg Score" value={`${stats.avg_score ?? 0}%`} />
                    <StatCard icon={Activity} label="Active Today" value={stats.active_today} />
                    <StatCard icon={Activity} label="Active This Week" value={stats.active_this_week} />
                  </div>
                )}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
                  {filtered.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {students.length === 0 ? "No students registered yet." : "No students match your search."}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead><TableHead>Grade</TableHead>
                          <TableHead className="text-center">Quizzes</TableHead><TableHead className="text-center">Avg %</TableHead>
                          <TableHead>Last Active</TableHead><TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((student) => (
                          <TableRow key={student.user_id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={student.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(student.full_name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-foreground">{student.full_name}</div>
                                  <div className="text-xs text-muted-foreground">{student.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {student.grade ? <Badge variant="secondary" className="text-xs">{student.grade}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center text-foreground">{student.total_quizzes_taken}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-foreground font-medium">{student.avg_percentage}%</span>
                                <Progress value={student.avg_percentage} className="h-1.5 w-12" />
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {student.last_quiz_at ? format(new Date(student.last_quiz_at), "MMM d, yyyy") : "Never"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => viewStudent(student)}>
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <SearchAnalytics />
              </TabsContent>

              <TabsContent value="suggestions" className="space-y-8">
                <SuggestionManager />
                <SuggestionHistory />
              </TabsContent>

              <TabsContent value="badges">
                <BadgeManager />
              </TabsContent>

              <TabsContent value="memos">
                <MemoRequestManager />
              </TabsContent>

              <TabsContent value="feedback">
                <FeedbackManager />
              </TabsContent>

              <TabsContent value="testimonials">
                <TestimonialManager />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
