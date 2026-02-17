import { useParams, Link } from "react-router-dom";
import {
  Calculator, Atom, Leaf, BookText, Globe, Landmark,
  PiggyBank, Briefcase, TrendingUp, Monitor,
} from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";

const subjects = [
  { name: "Mathematics", icon: Calculator },
  { name: "Physical Sciences", icon: Atom },
  { name: "Life Sciences", icon: Leaf },
  { name: "English", icon: BookText },
  { name: "Geography", icon: Globe },
  { name: "History", icon: Landmark },
  { name: "Accounting", icon: PiggyBank },
  { name: "Business Studies", icon: Briefcase },
  { name: "Economics", icon: TrendingUp },
  { name: "Computer Applications Technology", icon: Monitor },
];

const Subjects = () => {
  const { grade } = useParams();

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
              {subjects.map((s, i) => (
                <Link
                  key={s.name}
                  to={`/grades/${grade}/subjects/${encodeURIComponent(s.name)}`}
                  className="group bg-card border border-border rounded-lg p-5 flex items-center gap-4 shadow-card hover:shadow-card-hover transition-all duration-300 hover:border-primary/40"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-body font-medium text-foreground">{s.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Subjects;
