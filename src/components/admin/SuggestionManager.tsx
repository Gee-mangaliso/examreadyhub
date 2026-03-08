import { useState, useEffect } from "react";
import { Send, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Student { user_id: string; full_name: string; email: string }
interface ContentItem { id: string; title: string; type: string; subject_name: string }

const SuggestionManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [contentType, setContentType] = useState("");
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.rpc("admin_get_all_students").then(({ data }) => {
      setStudents((data as Student[]) || []);
    });
  }, []);

  useEffect(() => {
    if (!contentType) { setContentItems([]); return; }
    const fetchContent = async () => {
      let items: ContentItem[] = [];
      if (contentType === "note") {
        const { data } = await supabase.from("notes").select("id, title, subject_id, subjects(name)").order("created_at", { ascending: false }).limit(50) as { data: any[] | null };
        items = (data || []).map((d: any) => ({ id: d.id, title: d.title, type: "note", subject_name: d.subjects?.name || "" }));
      } else if (contentType === "slide") {
        const { data } = await supabase.from("slides").select("id, title, subject_id, subjects(name)").order("created_at", { ascending: false }).limit(50) as { data: any[] | null };
        items = (data || []).map((d: any) => ({ id: d.id, title: d.title, type: "slide", subject_name: d.subjects?.name || "" }));
      } else if (contentType === "worked_example") {
        const { data } = await supabase.from("worked_examples").select("id, title, subject_id, subjects(name)").order("created_at", { ascending: false }).limit(50) as { data: any[] | null };
        items = (data || []).map((d: any) => ({ id: d.id, title: d.title, type: "worked_example", subject_name: d.subjects?.name || "" }));
      } else if (contentType === "quiz" || contentType === "exam") {
        const { data } = await supabase.from("quizzes").select("id, title, type, subject_id, subjects(name)").eq("type", contentType).order("created_at", { ascending: false }).limit(50) as { data: any[] | null };
        items = (data || []).map((d: any) => ({ id: d.id, title: d.title, type: d.type, subject_name: d.subjects?.name || "" }));
      }
      setContentItems(items);
      setSelectedContent("");
    };
    fetchContent();
  }, [contentType]);

  const sendSuggestion = async () => {
    if (!selectedStudent || !selectedContent || !contentType || !user) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const item = contentItems.find((c) => c.id === selectedContent);
    if (!item) return;

    setSending(true);
    const { error } = await supabase.from("admin_suggestions").insert({
      user_id: selectedStudent,
      suggested_by: user.id,
      content_type: contentType,
      content_id: selectedContent,
      content_title: item.title,
      subject_name: item.subject_name,
      message: message || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Also send notification
      await supabase.rpc("create_notification", {
        _user_id: selectedStudent,
        _type: "suggestion",
        _title: "New Study Suggestion 💡",
        _message: `Your admin recommended: "${item.title}" (${item.subject_name})`,
        _metadata: { content_type: contentType, content_id: selectedContent },
      });
      toast({ title: "Suggestion sent!" });
      setMessage("");
      setSelectedContent("");
    }
    setSending(false);
  };

  const filteredStudents = students.filter(
    (s) => s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-heading text-foreground">Send Study Suggestions</h2>
      </div>
      <p className="text-sm text-muted-foreground">Recommend specific content for students to study.</p>

      <div className="bg-card border border-border rounded-lg p-6 shadow-card space-y-4">
        <div className="space-y-2">
          <Label>Select Student</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 mb-2" />
          </div>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
            <SelectContent>
              {filteredStudents.slice(0, 20).map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.full_name} ({s.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger><SelectValue placeholder="Choose content type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="slide">Slide</SelectItem>
              <SelectItem value="worked_example">Worked Example</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="exam">Practice Exam</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {contentItems.length > 0 && (
          <div className="space-y-2">
            <Label>Select Content</Label>
            <Select value={selectedContent} onValueChange={setSelectedContent}>
              <SelectTrigger><SelectValue placeholder="Choose content" /></SelectTrigger>
              <SelectContent>
                {contentItems.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title} — {c.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Message (optional)</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Focus on this topic for next week's test…" rows={3} />
        </div>

        <Button onClick={sendSuggestion} disabled={sending} className="w-full gap-1.5">
          <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send Suggestion"}
        </Button>
      </div>
    </div>
  );
};

export default SuggestionManager;
