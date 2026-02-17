import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";

const Home = () => {
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
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 bg-background">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-heading text-center mb-12 text-foreground">Everything you need to succeed</h2>
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
