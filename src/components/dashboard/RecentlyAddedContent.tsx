import { useEffect, useState } from "react";
import { Sparkles, FileText, Presentation, Lightbulb, HelpCircle, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserSubject { id: string; subject_id: string; subjects: { id: string; name: string; icon: string | null; grade_id: string } }

interface RecentContent {
  id: string;
  title: string;
  type: string;
  created_at: string;
  subject_name?: string;
  subject_id?: string;
}

const contentTypeIcons: Record<string, typeof FileText> = {
  note: FileText, slide: Presentation, worked_example: Lightbulb,
  quiz: HelpCircle, exam: ClipboardList,
};

const contentTypeLabels: Record<string, string> = {
  note: "Note", slide: "Slide", worked_example: "Worked Example",
  quiz: "Quiz", exam: "Practice Exam",
};

const RecentlyAddedContent = ({ mySubjects, onContentLoaded }: { mySubjects: UserSubject[]; onContentLoaded?: (items: any[]) => void }) => {
  const [items, setItems] = useState<RecentContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mySubjects.length === 0) { setLoading(false); return; }

    const subjectIds = mySubjects.map((s) => s.subject_id);
    const subjectNameMap = mySubjects.reduce<Record<string, string>>((acc, s) => {
      acc[s.subject_id] = s.subjects?.name || "Unknown";
      return acc;
    }, {});

    const fetchRecent = async () => {
      const [notesRes, slidesRes, examplesRes, quizzesRes] = await Promise.all([
        supabase.from("notes").select("id, title, created_at, subject_id").in("subject_id", subjectIds).order("created_at", { ascending: false }).limit(5),
        supabase.from("slides").select("id, title, created_at, subject_id").in("subject_id", subjectIds).order("created_at", { ascending: false }).limit(5),
        supabase.from("worked_examples").select("id, title, created_at, subject_id").in("subject_id", subjectIds).order("created_at", { ascending: false }).limit(5),
        supabase.from("quizzes").select("id, title, created_at, subject_id, type").in("subject_id", subjectIds).order("created_at", { ascending: false }).limit(5),
      ]);

      const all: RecentContent[] = [
        ...(notesRes.data || []).map((n) => ({ id: n.id, title: n.title, type: "note", created_at: n.created_at, subject_name: subjectNameMap[n.subject_id], subject_id: n.subject_id })),
        ...(slidesRes.data || []).map((s) => ({ id: s.id, title: s.title, type: "slide", created_at: s.created_at, subject_name: subjectNameMap[s.subject_id], subject_id: s.subject_id })),
        ...(examplesRes.data || []).map((e) => ({ id: e.id, title: e.title, type: "worked_example", created_at: e.created_at, subject_name: subjectNameMap[e.subject_id], subject_id: e.subject_id })),
        ...(quizzesRes.data || []).map((q) => ({ id: q.id, title: q.title, type: q.type || "quiz", created_at: q.created_at, subject_name: subjectNameMap[q.subject_id], subject_id: q.subject_id })),
      ];

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const sliced = all.slice(0, 8);
      setItems(sliced);
      onContentLoaded?.(sliced);
      setLoading(false);
    };

    fetchRecent();
  }, [mySubjects]);

  if (loading) return null;
  if (items.length === 0) return null;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="mt-10">
      <h2 className="text-xl font-heading text-foreground mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" /> Recently Added
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = contentTypeIcons[item.type] || FileText;
          return (
            <div key={`${item.type}-${item.id}`} className="bg-card border border-border rounded-lg p-4 shadow-card flex items-center gap-3 hover:border-primary/30 transition-colors">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{contentTypeLabels[item.type]}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{item.subject_name}</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">{formatTimeAgo(item.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlyAddedContent;
