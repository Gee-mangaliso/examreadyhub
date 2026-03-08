import { useState, useEffect, useMemo } from "react";
import { History, CheckCircle2, Circle, RefreshCw, Search, Filter, Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  reply: string | null;
  replied_at: string | null;
}

const SuggestionHistory = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchSuggestions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) {
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

  const filtered = useMemo(() => {
    return suggestions.filter((s) => {
      const matchesSearch =
        !search ||
        (s.student_name || "").toLowerCase().includes(search.toLowerCase()) ||
        s.content_title.toLowerCase().includes(search.toLowerCase()) ||
        (s.subject_name || "").toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || s.content_type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "read" && s.read) ||
        (statusFilter === "unread" && !s.read);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [suggestions, search, typeFilter, statusFilter]);

  const typeColors: Record<string, string> = {
    note: "bg-blue-500/10 text-blue-600 border-blue-200",
    slide: "bg-purple-500/10 text-purple-600 border-purple-200",
    worked_example: "bg-amber-500/10 text-amber-600 border-amber-200",
    quiz: "bg-green-500/10 text-green-600 border-green-200",
    exam: "bg-red-500/10 text-red-600 border-red-200",
  };

  const readCount = suggestions.filter((s) => s.read).length;
  const unreadCount = suggestions.filter((s) => !s.read).length;
  const repliedCount = suggestions.filter((s) => s.reply).length;

  const exportCSV = () => {
    const headers = ["Student", "Content", "Type", "Subject", "Message", "Reply", "Status", "Sent"];
    const rows = filtered.map((s) => [
      s.student_name || "",
      s.content_title,
      s.content_type.replace("_", " "),
      s.subject_name || "",
      s.message || "",
      s.reply || "",
      s.read ? "Read" : "Unread",
      format(new Date(s.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suggestions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-heading text-foreground">Sent Suggestions History</h2>
          <Badge variant="secondary" className="ml-2">{suggestions.length} total</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {readCount} read
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Circle className="h-3.5 w-3.5 text-muted-foreground" /> {unreadCount} unread
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student, content, or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="slide">Slide</SelectItem>
            <SelectItem value="worked_example">Worked Example</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="exam">Practice Exam</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading history…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {suggestions.length === 0 ? "No suggestions sent yet." : "No suggestions match your filters."}
          </div>
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
              {filtered.map((s) => (
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
