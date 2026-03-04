import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";

const Grades = () => {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<{ id: string; name: string; sort_order: number }[]>([]);

  useEffect(() => {
    supabase.from("grades").select("id, name, sort_order").order("sort_order")
      .then(({ data }) => setGrades(data || []));
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-heading text-foreground text-center mb-2">Select Your Grade</h1>
            <p className="text-muted-foreground text-center mb-12">Choose your grade to explore subjects and start studying.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {grades.map((g, i) => {
                const num = g.name.replace("Grade ", "");
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/grades/${num}/subjects`)}
                    className="group bg-card rounded-lg p-8 shadow-card hover:shadow-card-hover transition-all duration-300 text-center space-y-3 border border-border hover:border-primary/40"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="font-heading text-2xl text-foreground">{g.name}</h2>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Grades;
