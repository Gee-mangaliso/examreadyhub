import { useParams, Link } from "react-router-dom";
import { Lock, FileText, Presentation, Lightbulb, HelpCircle, ClipboardList } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";

const sections = [
  { id: "notes", label: "Notes", icon: FileText, locked: false },
  { id: "slides", label: "Slides", icon: Presentation, locked: false },
  { id: "examples", label: "Worked Examples", icon: Lightbulb, locked: false },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle, locked: true },
  { id: "exams", label: "Practice Exams", icon: ClipboardList, locked: true },
];

const SubjectDetail = () => {
  const { grade, subject } = useParams();
  const subjectName = decodeURIComponent(subject || "");

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Link to={`/grades/${grade}/subjects`} className="text-sm text-primary hover:underline mb-4 inline-block">
              ← Back to Grade {grade} Subjects
            </Link>
            <h1 className="text-3xl sm:text-4xl font-heading text-foreground mb-1">{subjectName}</h1>
            <p className="text-muted-foreground mb-8">Grade {grade}</p>

            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1 rounded-lg">
                {sections.map((s) => (
                  <TabsTrigger
                    key={s.id}
                    value={s.id}
                    className="flex items-center gap-1.5 text-sm data-[state=active]:bg-card data-[state=active]:shadow-card"
                  >
                    <s.icon className="h-4 w-4" />
                    {s.label}
                    {s.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </TabsTrigger>
                ))}
              </TabsList>

              {sections.map((s) => (
                <TabsContent key={s.id} value={s.id} className="mt-6">
                  <div className="bg-card border border-border rounded-lg p-8 shadow-card min-h-[250px] flex flex-col items-center justify-center text-center">
                    {s.locked ? (
                      <>
                        <Lock className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground font-medium">Please log in to access quizzes and practice exams.</p>
                        <Link to="/login" className="mt-4 text-primary hover:underline text-sm">Go to Login →</Link>
                      </>
                    ) : (
                      <>
                        <s.icon className="h-10 w-10 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Content will appear here.</p>
                      </>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default SubjectDetail;
