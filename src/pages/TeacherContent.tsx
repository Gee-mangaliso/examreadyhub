import { useState, useEffect } from "react";
import { BookOpen, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface ContentItem {
  id: string;
  teacher_id: string;
  title: string;
  content: string | null;
  content_type: string;
  created_at: string;
  teacher_name?: string;
}

const TeacherContent = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchContent = async () => {
      // Get my teachers
      const { data: links } = await supabase.from("teacher_students").select("teacher_id").eq("student_id", user.id);
      const teacherIds = (links || []).map((l: any) => l.teacher_id);
      if (teacherIds.length === 0) { setLoading(false); return; }

      const { data: contentData } = await supabase.from("teacher_content").select("*").in("teacher_id", teacherIds).order("created_at", { ascending: false });
      
      // Get teacher names
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });

      setItems((contentData || []).map((c: any) => ({ ...c, teacher_name: nameMap[c.teacher_id] || "Teacher" })));
      setLoading(false);
    };
    fetchContent();
  }, [user]);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-10 px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-heading text-foreground mb-2">Teacher Content</h1>
            <p className="text-muted-foreground mb-8">Content shared by your teachers</p>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No content available. Accept a teacher invite to see their content.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-5 shadow-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.content_type}</Badge>
                      <span className="text-xs text-muted-foreground">by {item.teacher_name}</span>
                    </div>
                    <h3 className="font-heading text-foreground">{item.title}</h3>
                    {item.content && <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>}
                    <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default TeacherContent;
