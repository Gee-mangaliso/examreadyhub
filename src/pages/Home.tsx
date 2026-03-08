import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, GraduationCap, ArrowRight, FileText, HelpCircle, ClipboardList,
  Target, Users, Lightbulb, Shield, Brain, Trophy, Heart, Sparkles
} from "lucide-react";
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
                    <Link to={(() => {
                      if (mySubjects.length === 0) return "/grades";
                      const gradeId = mySubjects[0].subjects?.grade_id;
                      const allSameGrade = mySubjects.every(s => s.subjects?.grade_id === gradeId);
                      if (allSameGrade) {
                        const num = getGradeNum(gradeId);
                        return `/grades/${num}/subjects`;
                      }
                      return "/grades";
                    })()}>
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
                      Login / Admin
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-heading text-foreground mb-4">About ExamReady Hub</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                ExamReady Hub is a comprehensive online learning platform designed specifically for South African high school students in Grades 8–12. We provide quality study materials aligned with the CAPS curriculum to help every learner achieve their academic goals.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8">
              <div className="bg-card rounded-xl p-6 shadow-card text-center space-y-3 border border-border">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg text-foreground">Built for Learners</h3>
                <p className="text-muted-foreground text-sm">Created by educators who understand the South African curriculum and what students need to succeed.</p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card text-center space-y-3 border border-border">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg text-foreground">CAPS Aligned</h3>
                <p className="text-muted-foreground text-sm">All content follows the Curriculum and Assessment Policy Statement, ensuring relevance and accuracy.</p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card text-center space-y-3 border border-border">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg text-foreground">AI-Powered Help</h3>
                <p className="text-muted-foreground text-sm">Get instant help from our AI study assistant that understands your subjects and adapts to your learning needs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 px-4 bg-background">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm mb-6">
              <Heart className="h-4 w-4" />
              Our Mission
            </div>
            <h2 className="text-3xl font-heading text-foreground mb-6">Empowering Every Learner to Succeed</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Our mission is to bridge the educational gap by providing free, high-quality study resources to every South African high school student — regardless of their background or location. We believe that with the right tools, every learner can achieve academic excellence.
            </p>
            <div className="grid sm:grid-cols-3 gap-6 mt-10">
              <div className="flex flex-col items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-foreground">Accessible Education</h3>
                <p className="text-muted-foreground text-sm">Quality resources available to all students across South Africa.</p>
              </div>
              <div className="flex flex-col items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-foreground">Active Learning</h3>
                <p className="text-muted-foreground text-sm">Interactive quizzes and practice exams to reinforce understanding.</p>
              </div>
              <div className="flex flex-col items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-foreground">Exam Excellence</h3>
                <p className="text-muted-foreground text-sm">Targeted exam prep with past papers and worked solutions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features / What We Offer */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm mb-4">
                <Sparkles className="h-4 w-4" />
                What We Offer
              </div>
              <h2 className="text-3xl font-heading text-foreground">Everything you need to succeed</h2>
            </div>

            {user && mySubjects.length > 0 ? (
              <div className="space-y-6">
                {[
                  { title: "Comprehensive Notes", desc: "In-depth study materials covering every topic in the CAPS curriculum, written in clear and simple language.", icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
                  { title: "Practice Quizzes", desc: "Interactive multiple-choice quizzes with instant feedback, explanations, and score tracking to test your knowledge.", icon: HelpCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
                  { title: "Worked Examples", desc: "Step-by-step worked solutions that show you exactly how to approach and solve exam-style problems.", icon: Lightbulb, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                  { title: "Practice Exams", desc: "Real past exam papers from all nine provinces with a lockdown browser for authentic exam conditions.", icon: ClipboardList, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
                  { title: "AI Study Assistant", desc: "Get instant help from our AI chatbot — explain concepts, solve problems, and get personalised study tips 24/7.", icon: Brain, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
                ].map((feature) => (
                  <div key={feature.title} className="bg-card rounded-xl p-6 shadow-card border border-border">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${feature.bg} shrink-0`}>
                        <feature.icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-lg text-foreground mb-1">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm mb-3">{feature.desc}</p>
                        <div className="flex flex-wrap gap-2">
                          {mySubjects.map((us) => {
                            const Icon = iconMap[us.subjects?.icon || ""] || Icons.BookOpen;
                            const gradeNum = getGradeNum(us.subjects?.grade_id);
                            return (
                              <Link
                                key={us.id}
                                to={`/grades/${gradeNum}/subjects/${encodeURIComponent(us.subjects?.name || "")}`}
                                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                              >
                                <Icon className="h-3.5 w-3.5 text-primary" />
                                {us.subjects?.name}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "Comprehensive Notes", desc: "In-depth study materials covering every topic in the CAPS curriculum.", icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
                  { title: "Practice Quizzes", desc: "Interactive quizzes with instant feedback and score tracking.", icon: HelpCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
                  { title: "Worked Examples", desc: "Step-by-step solutions for exam-style problems.", icon: Lightbulb, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                  { title: "Practice Exams", desc: "Real past papers with lockdown browser for authentic conditions.", icon: ClipboardList, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
                  { title: "AI Study Assistant", desc: "Get instant AI-powered help with any subject, 24/7.", icon: Brain, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
                  { title: "Leaderboard & Badges", desc: "Compete with friends, earn badges, and track your streaks.", icon: Trophy, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
                ].map((f) => (
                  <div key={f.title} className="bg-card rounded-xl p-6 shadow-card border border-border text-center space-y-3">
                    <div className={`h-12 w-12 rounded-xl ${f.bg} flex items-center justify-center mx-auto`}>
                      <f.icon className={`h-6 w-6 ${f.color}`} />
                    </div>
                    <h3 className="font-heading text-lg text-foreground">{f.title}</h3>
                    <p className="text-muted-foreground text-sm">{f.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-background">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-heading text-foreground mb-4">Ready to start studying?</h2>
            <p className="text-muted-foreground mb-8">Join thousands of South African learners who are already using ExamReady Hub to prepare for their exams.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Button asChild size="lg" className="text-base px-8">
                  <Link to="/dashboard">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="text-base px-8">
                    <Link to="/signup">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-base px-8">
                    <Link to="/grades">
                      Browse Content
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8 px-4 text-center text-sm text-muted-foreground">
          © 2026 ExamReady Hub. All rights reserved.
        </footer>
      </div>
    </PageTransition>
  );
};

export default Home;
