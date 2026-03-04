import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import * as Icons from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator: Icons.Calculator, Atom: Icons.Atom, Leaf: Icons.Leaf,
  BookText: Icons.BookText, Globe: Icons.Globe, Landmark: Icons.Landmark,
  PiggyBank: Icons.PiggyBank, Briefcase: Icons.Briefcase, TrendingUp: Icons.TrendingUp,
  Monitor: Icons.Monitor,
};

const Subjects = () => {
  const { grade } = useParams();
  const [subjects, setSubjects] = useState<{ id: string; name: string; icon: string | null }[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data: gradeData } = await supabase
        .from("grades").select("id").eq("name", `Grade ${grade}`).single();
      if (!gradeData) return;
      const { data } = await supabase
        .from("subjects").select("id, name, icon").eq("grade_id", gradeData.id);
      setSubjects(data || []);
    };
    fetchSubjects();
  }, [grade]);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <Link to="/grades" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to Grades</Link>
            <h1 className="text-3xl sm:text-4xl font-heading text-foreground mb-2">Grade {grade} Subjects</h1>
            <p className="text-muted-foreground mb-10">Select a subject to view study materials.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjects.map((s, i) => {
                const Icon = iconMap[s.icon || ""] || Icons.BookOpen;
                return (
                  <Link
                    key={s.id}
                    to={`/grades/${grade}/subjects/${encodeURIComponent(s.name)}`}
                    className="group bg-card border border-border rounded-lg p-5 flex items-center gap-4 shadow-card hover:shadow-card-hover transition-all duration-300 hover:border-primary/40"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-body font-medium text-foreground">{s.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Subjects;
