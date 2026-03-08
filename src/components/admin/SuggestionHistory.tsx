import { useState, useEffect } from "react";
import { History, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { playNotification } from "@/lib/sounds";

interface Suggestion {
  id: string;
  user_id: string;
  content_type: string;
  content_title: string;
  subject_name: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  student_name?: string;
}

const SuggestionHistory = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      // Fetch student names
      const userIds = [...new Set(data.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        nameMap[p.user_id] = p.full_name || "Unknown";
      });

      setSuggestions(
        data.map((s) => ({ ...s, student_name: nameMap[s.user_id] || "Unknown" }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuggestions();

    // Realtime subscription for new suggestions
    const channel = supabase
      .channel("admin-suggestions-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_suggestions" }, () => {
        playNotification();
        fetchSuggestions();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "admin_suggestions" }, () => {
        fetchSuggestions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const typeColors: Record<string, string> = {
    note: "bg-blue-500/10 text-blue-600 border-blue-200",
    slide: "bg-purple-500/10 text-purple-600 border-purple-200",
    worked_example: "bg-amber-500/10 text-amber-600 border-amber-200",
    quiz: "bg-green-500/10 text-green-600 border-green-200",
    exam: "bg-red-500/10 text-red-600 border-red-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-heading text-foreground">Sent Suggestions History</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading history…</div>
        ) : suggestions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No suggestions sent yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-foreground">{s.student_name}</TableCell>
                  <TableCell className="text-foreground max-w-[200px] truncate">{s.content_title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={typeColors[s.content_type] || ""}>
                      {s.content_type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.subject_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                    {s.message || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.read ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Read
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <Circle className="h-3 w-3" /> Unread
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(s.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default SuggestionHistory;
