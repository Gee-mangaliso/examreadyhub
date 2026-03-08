import { useEffect, useState } from "react";
import { Clock, HelpCircle, ClipboardList, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Activity {
  id: string;
  type: "quiz_attempt" | "study";
  title: string;
  detail: string;
  timestamp: string;
}

const RecentActivity = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, completed_at, quiz_id, quizzes(title, type)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10) as { data: any[] | null };

      const items: Activity[] = (attempts || []).map((a: any) => ({
        id: a.id,
        type: "quiz_attempt" as const,
        title: a.quizzes?.title || "Quiz",
        detail: `Scored ${a.score}/${a.total_questions} (${a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0}%)`,
        timestamp: a.completed_at,
      }));

      setActivities(items);
      setLoading(false);
    };
    fetch();
  }, [user]);

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

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-card min-h-[180px] flex items-center justify-center">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-3 min-h-[180px]">
      <div className="flex items-center gap-2 text-foreground">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg">Recent Activity</h2>
      </div>
      {activities.length === 0 ? (
        <p className="text-muted-foreground text-sm">Your recent study sessions will appear here.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                {a.type === "quiz_attempt" ? (
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">{formatTimeAgo(a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
