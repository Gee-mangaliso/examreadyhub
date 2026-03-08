import { useState, useEffect } from "react";
import {
  Send, CheckCircle, XCircle, Clock, Eye, FileText, Upload,
  Loader2, Search, ExternalLink, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MemoRequestRow {
  id: string;
  user_id: string;
  exam_paper_id: string;
  status: string;
  memo_url: string | null;
  admin_note: string | null;
  created_at: string;
  responded_at: string | null;
  // joined
  learner_name: string;
  learner_email: string;
  paper_title: string;
  paper_province: string;
  paper_term: string;
  paper_year: number;
  subject_name: string;
  grade_name: string;
  completed: boolean;
  score: number | null;
  total_marks: number | null;
}

const MemoRequestManager = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MemoRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [respondDialog, setRespondDialog] = useState<MemoRequestRow | null>(null);
  const [memoUrl, setMemoUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "sent" | "declined">("pending");

  const fetchRequests = async () => {
    setLoading(true);
    // Fetch memo requests with related data
    const { data: memoData } = await supabase
      .from("memo_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!memoData || memoData.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Get unique exam_paper_ids and user_ids
    const paperIds = [...new Set(memoData.map((m: any) => m.exam_paper_id))];
    const userIds = [...new Set(memoData.map((m: any) => m.user_id))];

    // Fetch related data in parallel
    const [papersRes, profilesRes, completionsRes] = await Promise.all([
      supabase.from("exam_papers").select("id, title, province, term, year, subject_id, subjects(name, grade_id, grades(name))").in("id", paperIds),
      supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
      supabase.from("exam_completions").select("user_id, exam_paper_id, score, total_marks").in("exam_paper_id", paperIds),
    ]);

    const paperMap: Record<string, any> = {};
    (papersRes.data || []).forEach((p: any) => { paperMap[p.id] = p; });

    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    const completionMap: Record<string, any> = {};
    (completionsRes.data || []).forEach((c: any) => {
      completionMap[`${c.user_id}-${c.exam_paper_id}`] = c;
    });

    const enriched: MemoRequestRow[] = memoData.map((m: any) => {
      const paper = paperMap[m.exam_paper_id] || {};
      const profile = profileMap[m.user_id] || {};
      const completion = completionMap[`${m.user_id}-${m.exam_paper_id}`];
      return {
        ...m,
        learner_name: profile.full_name || "Unknown",
        learner_email: "",
        paper_title: paper.title || "Unknown Paper",
        paper_province: paper.province || "",
        paper_term: paper.term || "",
        paper_year: paper.year || 0,
        subject_name: paper.subjects?.name || "",
        grade_name: paper.subjects?.grades?.name || "",
        completed: !!completion,
        score: completion?.score ?? null,
        total_marks: completion?.total_marks ?? null,
      };
    });

    setRequests(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const respondToRequest = async (status: "sent" | "declined") => {
    if (!respondDialog) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("memo_requests")
      .update({
        status,
        memo_url: status === "sent" ? memoUrl || null : null,
        admin_note: adminNote || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", respondDialog.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "sent" ? "Memo sent!" : "Request declined" });
      // Also create a notification for the learner
      await supabase.rpc("create_notification", {
        _user_id: respondDialog.user_id,
        _type: "memo",
        _title: status === "sent" ? "Memo Available 📝" : "Memo Request Update",
        _message: status === "sent"
          ? `The memo for "${respondDialog.paper_title}" is now available.`
          : `Your memo request for "${respondDialog.paper_title}" was declined.${adminNote ? ` Note: ${adminNote}` : ""}`,
        _metadata: JSON.stringify({ exam_paper_id: respondDialog.exam_paper_id, memo_url: memoUrl || null }),
      });
      fetchRequests();
    }
    setRespondDialog(null);
    setMemoUrl("");
    setAdminNote("");
    setSubmitting(false);
  };

  const filtered = requests.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.learner_name.toLowerCase().includes(s) ||
        r.paper_title.toLowerCase().includes(s) ||
        r.subject_name.toLowerCase().includes(s) ||
        r.paper_province.toLowerCase().includes(s)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "sent", "declined"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {f} {f !== "all" && `(${requests.filter((r) => r.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center shadow-card">
          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {requests.length === 0 ? "No memo requests yet." : "No requests match your filter."}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Exam Paper</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Completed</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.learner_name}</TableCell>
                  <TableCell>
                    <div>
                      <span className="text-sm text-foreground">{r.paper_title}</span>
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{r.paper_province}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.paper_term}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.paper_year}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.subject_name} · {r.grade_name}</TableCell>
                  <TableCell className="text-center">
                    {r.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm text-foreground">
                    {r.score !== null ? `${r.score}/${r.total_marks}` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.status === "pending" && <Badge variant="secondary" className="text-xs gap-1"><Clock className="h-2.5 w-2.5" /> Pending</Badge>}
                    {r.status === "sent" && <Badge variant="secondary" className="text-xs gap-1 text-green-600"><CheckCircle className="h-2.5 w-2.5" /> Sent</Badge>}
                    {r.status === "declined" && <Badge variant="destructive" className="text-xs gap-1"><XCircle className="h-2.5 w-2.5" /> Declined</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRespondDialog(r); setMemoUrl(""); setAdminNote(""); }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> Respond
                      </Button>
                    )}
                    {r.status === "sent" && r.memo_url && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={r.memo_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Respond dialog */}
      <Dialog open={!!respondDialog} onOpenChange={(o) => !o && setRespondDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Memo Request</DialogTitle>
          </DialogHeader>
          {respondDialog && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium text-foreground">Learner:</span> {respondDialog.learner_name}</p>
                <p><span className="font-medium text-foreground">Paper:</span> {respondDialog.paper_title}</p>
                <p><span className="font-medium text-foreground">Subject:</span> {respondDialog.subject_name} · {respondDialog.grade_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-medium text-foreground">Exam Completed:</span>
                  {respondDialog.completed ? (
                    <Badge variant="secondary" className="text-xs gap-1 text-green-600">
                      <CheckCircle className="h-2.5 w-2.5" /> Yes — {respondDialog.score}/{respondDialog.total_marks}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertCircle className="h-2.5 w-2.5" /> Not completed
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Memo URL (file link)</label>
                <Input
                  value={memoUrl}
                  onChange={(e) => setMemoUrl(e.target.value)}
                  placeholder="https://... or paste file link"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Note (optional)</label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Any message for the learner..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => respondToRequest("sent")} disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Send Memo
                </Button>
                <Button variant="destructive" onClick={() => respondToRequest("declined")} disabled={submitting} className="flex-1">
                  <XCircle className="h-4 w-4 mr-1" /> Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemoRequestManager;
