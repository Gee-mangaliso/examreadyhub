import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, ArrowRight, FileText, HelpCircle, ClipboardList } from "lucide-react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: Icons.Calculator, Atom: Icons.Atom, Leaf: Icons.Leaf,
  BookText: Icons.BookText, Globe: Icons.Globe, Landmark: Icons.Landmark,
  PiggyBank: Icons.PiggyBank, Briefcase: Icons.Briefcase, TrendingUp: Icons.TrendingUp,
  Monitor: Icons.Monitor,
};

interface UserSubject {
  id: string;
  subject_id: string;
  subjects: { id: string; name: string; icon: string | null; grade_id: string };
}

interface Grade { id: string; name: string }

const Home = () => {
  const { user } = useAuth();
  const [mySubjects, setMySubjects] = useState<UserSubject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_subjects")
      .select("id, subject_id, subjects(id, name, icon, grade_id)")
      .eq("user_id", user.id)
      .then(({ data }) => setMySubjects((data || []) as any));
    supabase.from("grades").select("id, name").then(({ data }) => setGrades(data || []));
  }, [user]);

  const getGradeNum = (gradeId: string) => {
    const g = grades.find(g => g.id === gradeId);
    return g?.name?.replace("Grade ", "") || "";
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">
        <Header />

        {/* Hero */}
        <section className="gradient-hero flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-1.5 text-primary-foreground text-sm">
              <GraduationCap className="h-4 w-4" />
              Grade 8–12
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading text-primary-foreground leading-tight">
              ExamReady Hub
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-xl mx-auto">
              An online learning platform for high school exam preparation
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-elevated text-base px-8">
                    <Link to="/dashboard">
                      <BookOpen className="mr-2 h-5 w-5" />
                      My Dashboard
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8">
                    <Link to="/grades">
                      Browse Subjects
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-elevated text-base px-8">
                    <Link to="/grades">
                      <BookOpen className="mr-2 h-5 w-5" />
                      Browse Grades
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8">
                    <Link to="/login">
                      Login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 bg-background">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-heading text-center mb-12 text-foreground">Everything you need to succeed</h2>

            {user && mySubjects.length > 0 ? (
              <div className="space-y-10">
                {[
                  { title: "Comprehensive Notes", desc: "Study materials for every subject.", icon: FileText, tab: "notes" },
                  { title: "Practice Quizzes", desc: "Test your knowledge with interactive quizzes.", icon: HelpCircle, tab: "quizzes" },
                  { title: "Exam Preparation", desc: "Past papers and worked examples to get you ready.", icon: ClipboardList, tab: "exams" },
                ].map((feature) => (
                  <div key={feature.title} className="bg-card rounded-lg p-6 shadow-card space-y-4">
                    <div className="flex items-center gap-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                      <h3 className="font-heading text-xl text-foreground">{feature.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {mySubjects.map((us) => {
                        const Icon = iconMap[us.subjects?.icon || ""] || Icons.BookOpen;
                        const gradeNum = getGradeNum(us.subjects?.grade_id);
                        return (
                          <Link
                            key={us.id}
                            to={`/grades/${gradeNum}/subjects/${encodeURIComponent(us.subjects?.name || "")}`}
                            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          >
                            <Icon className="h-4 w-4 text-primary" />
                            {us.subjects?.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-8">
                {[
                  { title: "Comprehensive Notes", desc: "Study materials for every subject and grade." },
                  { title: "Practice Quizzes", desc: "Test your knowledge with interactive quizzes." },
                  { title: "Exam Preparation", desc: "Past papers and worked examples to get you ready." },
                ].map((f) => (
                  <div key={f.title} className="bg-card rounded-lg p-6 shadow-card text-center space-y-3">
                    <h3 className="font-heading text-xl text-foreground">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8 px-4 text-center text-sm text-muted-foreground">
          © 2026 ExamReady Hub. All rights reserved.
        </footer>
      </div>
    </PageTransition>
  );
};

export default Home;
