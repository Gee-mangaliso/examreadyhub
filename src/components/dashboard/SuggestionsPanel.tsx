import { useEffect, useState } from "react";
import { Sparkles, FileText, Presentation, Lightbulb, HelpCircle, ClipboardList, Check, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playNotification, playSend } from "@/lib/sounds";

interface Suggestion {
  id: string;
  content_type: string;
  content_id: string;
  content_title: string;
  subject_name: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  reply: string | null;
  replied_at: string | null;
}

const contentTypeIcons: Record<string, typeof FileText> = {
  note: FileText, slide: Presentation, worked_example: Lightbulb,
  quiz: HelpCircle, exam: ClipboardList,
};

const contentTypeLabels: Record<string, string> = {
  note: "Note", slide: "Slide", worked_example: "Worked Example",
  quiz: "Quiz", exam: "Practice Exam",
};

const SuggestionsPanel = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const fetchSuggestions = () => {
    if (!user) return;
    supabase
      .from("admin_suggestions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setSuggestions((data as Suggestion[]) || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!user) return;
    fetchSuggestions();

    // Realtime: play sound when a new suggestion arrives for this learner
    const channel = supabase
      .channel("learner-suggestions-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_suggestions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          playNotification();
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("admin_suggestions").update({ read: true }).eq("id", id);
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, read: true } : s)));
  };

  const sendReply = async (id: string) => {
    const text = replyText.trim();
    if (!text) return;
    await supabase.from("admin_suggestions").update({ reply: text, replied_at: new Date().toISOString(), read: true }).eq("id", id);
    playSend();
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, reply: text, read: true } : s)));
    setReplyingTo(null);
    setReplyText("");
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-card min-h-[180px] flex items-center justify-center">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg">Suggestions from Admin</h2>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-muted-foreground text-sm">Personalised study recommendations from your admin will appear here.</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {suggestions.map((s) => {
            const Icon = contentTypeIcons[s.content_type] || FileText;
            return (
              <div
                key={s.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  s.read ? "border-border bg-muted/30" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.content_title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{contentTypeLabels[s.content_type] || s.content_type}</span>
                    {s.subject_name && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{s.subject_name}</span>
                      </>
                    )}
                  </div>
                {s.message && <p className="text-xs text-muted-foreground mt-1 italic">"{s.message}"</p>}
                  {s.reply && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> You replied: "{s.reply}"
                    </p>
                  )}
                  {replyingTo === s.id && (
                    <div className="flex gap-1.5 mt-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply…"
                        className="h-7 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && sendReply(s.id)}
                      />
                      <Button size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => sendReply(s.id)}>
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!s.read && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => markRead(s.id)} title="Mark as read">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!s.reply && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setReplyingTo(replyingTo === s.id ? null : s.id); setReplyText(""); }} title="Reply">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuggestionsPanel;
