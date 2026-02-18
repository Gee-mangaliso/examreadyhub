import { User, BarChart3, Clock, Trophy, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";

const cards = [
  { title: "Performance Summary", icon: BarChart3, desc: "Your scores and progress will appear here." },
  { title: "Recent Activity", icon: Clock, desc: "Your recent study sessions will appear here." },
  { title: "Quiz History", icon: Trophy, desc: "Past quiz results will appear here." },
  { title: "Suggestions", icon: Sparkles, desc: "Personalised study recommendations will appear here." },
];

const Dashboard = () => {
  const { user, profile } = useAuth();

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-6 shadow-card flex items-center gap-5 mb-10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-heading text-foreground">
                  Welcome, {profile?.full_name || "Learner"}
                </h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {cards.map((c) => (
                <div key={c.title} className="bg-card border border-border rounded-lg p-6 shadow-card space-y-3 min-h-[180px]">
                  <div className="flex items-center gap-2 text-foreground">
                    <c.icon className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg">{c.title}</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
