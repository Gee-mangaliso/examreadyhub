import { useState, useEffect } from "react";
import {
  MapPin, Calendar, FileText, CheckCircle, Send, Download,
  ChevronDown, ChevronUp, Loader2, ClipboardList, ExternalLink, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ExamLockdownViewer from "./ExamLockdownViewer";

const PROVINCES = [
  "Common Papers",
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const TERMS = ["Term 1", "Term 2", "Term 3", "Term 4"];
const YEARS = Array.from({ length: 8 }, (_, i) => 2025 - i); // 2025 down to 2018

interface ExamPaper {
  id: string;
  province: string;
  term: string;
  year: number;
  title: string;
  file_url: string | null;
}

interface Completion {
  exam_paper_id: string;
  score: number;
  total_marks: number;
}

interface MemoRequest {
  exam_paper_id: string;
  status: string;
  memo_url: string | null;
}

const PracticeExamsBrowser = ({ subjectId }: { subjectId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [completions, setCompletions] = useState<Record<string, Completion>>({});
  const [memoRequests, setMemoRequests] = useState<Record<string, MemoRequest>>({});
  const [loading, setLoading] = useState(false);
  const [scoreDialog, setScoreDialog] = useState<ExamPaper | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [totalMarksInput, setTotalMarksInput] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [activePaper, setActivePaper] = useState<ExamPaper | null>(null);
  // Fetch papers for subject + province
  useEffect(() => {
    if (!selectedProvince) { setPapers([]); setLoading(false); return; }
    const fetchPapers = async () => {
      setLoading(true);
      let query = supabase
        .from("exam_papers")
        .select("id, province, term, year, title, file_url")
        .eq("subject_id", subjectId)
        .eq("province", selectedProvince)
        .order("year", { ascending: false })
        .order("term");

      if (selectedYear !== "all") {
        query = query.eq("year", parseInt(selectedYear));
      }

      const { data } = await query;
      setPapers((data || []) as ExamPaper[]);
      setLoading(false);
    };
    fetchPapers();
  }, [subjectId, selectedProvince, selectedYear]);

  // Fetch completions and memo requests
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      const [compRes, memoRes] = await Promise.all([
        supabase.from("exam_completions").select("exam_paper_id, score, total_marks").eq("user_id", user.id),
        supabase.from("memo_requests").select("exam_paper_id, status, memo_url").eq("user_id", user.id),
      ]);
      if (compRes.data) {
        const map: Record<string, Completion> = {};
        compRes.data.forEach((c: any) => { map[c.exam_paper_id] = c; });
        setCompletions(map);
      }
      if (memoRes.data) {
        const map: Record<string, MemoRequest> = {};
        memoRes.data.forEach((m: any) => { map[m.exam_paper_id] = m; });
        setMemoRequests(map);
      }
    };
    fetchUserData();
  }, [user]);

  const submitScore = async () => {
    if (!user || !scoreDialog) return;
    const score = parseInt(scoreInput);
    const total = parseInt(totalMarksInput);
    if (isNaN(score) || isNaN(total) || score < 0 || total <= 0 || score > total) {
      toast({ title: "Invalid score", description: "Please enter valid marks.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("exam_completions").upsert(
      { user_id: user.id, exam_paper_id: scoreDialog.id, score, total_marks: total },
      { onConflict: "user_id,exam_paper_id" }
    );
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCompletions((prev) => ({ ...prev, [scoreDialog.id]: { exam_paper_id: scoreDialog.id, score, total_marks: total } }));
      toast({ title: "Score recorded!", description: `${score}/${total} saved.` });
    }
    setScoreDialog(null);
    setScoreInput("");
    setTotalMarksInput("100");
    setSubmitting(false);
  };

  const requestMemo = async (paper: ExamPaper) => {
    if (!user) return;
    const { error } = await supabase.from("memo_requests").insert({
      user_id: user.id,
      exam_paper_id: paper.id,
    });
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already requested", description: "You've already requested this memo.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    setMemoRequests((prev) => ({ ...prev, [paper.id]: { exam_paper_id: paper.id, status: "pending", memo_url: null } }));
    toast({ title: "Memo requested!", description: "The admin will review and send the memo." });
  };

  // Group papers by year
  const grouped = papers.reduce<Record<number, ExamPaper[]>>((acc, p) => {
    if (!acc[p.year]) acc[p.year] = [];
    acc[p.year].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedProvince} onValueChange={setSelectedProvince}>
            <SelectTrigger className="w-[200px] bg-card border-border">
              <SelectValue placeholder="Select province or paper type" />
            </SelectTrigger>
            <SelectContent>
              {PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {!selectedProvince ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center shadow-card">
          <MapPin className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Select a province or paper type above to view exam papers.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : papers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center shadow-card">
          <ClipboardList className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">No exam papers available for {selectedProvince}.</p>
          <p className="text-muted-foreground text-sm mt-1">Papers will be added by the admin.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, yearPapers]) => (
              <div key={year}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{year}</h3>
                <div className="space-y-2">
                  {yearPapers
                    .sort((a, b) => a.term.localeCompare(b.term))
                    .map((paper) => {
                      const completion = completions[paper.id];
                      const memo = memoRequests[paper.id];
                      const pct = completion ? Math.round((completion.score / completion.total_marks) * 100) : null;

                      return (
                        <div
                          key={paper.id}
                          className="bg-card border border-border rounded-lg shadow-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
                        >
                          {/* Clickable paper row */}
                          <button
                            onClick={() => {
                              if (!completion) {
                                setActivePaper(paper);
                              }
                            }}
                            className="w-full text-left p-4 flex items-center gap-3 cursor-pointer"
                          >
                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{paper.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px]">{paper.term}</Badge>
                                <Badge variant="outline" className="text-[10px]">{paper.year}</Badge>
                                {completion && (
                                  <Badge variant="secondary" className="text-[10px] gap-0.5">
                                    <CheckCircle className="h-2.5 w-2.5 text-green-500" />
                                    {completion.score}/{completion.total_marks} ({pct}%)
                                  </Badge>
                                )}
                                {!completion && (
                                  <Badge variant="outline" className="text-[10px] gap-0.5 text-primary">
                                    <Play className="h-2.5 w-2.5" /> Write Exam
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {paper.file_url && (
                              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </button>

                          {/* Action bar for completed papers */}
                          {completion && (
                            <div className="border-t border-border px-4 py-2 flex items-center justify-end gap-2 bg-muted/20">
                              {!memo ? (
                                <Button size="sm" variant="outline" onClick={() => requestMemo(paper)}>
                                  <Send className="h-3.5 w-3.5 mr-1" /> Request Memo
                                </Button>
                              ) : memo.status === "pending" ? (
                                <Badge variant="secondary" className="text-xs">Memo Pending</Badge>
                              ) : memo.status === "sent" && memo.memo_url ? (
                                <Button asChild size="sm" variant="outline">
                                  <a href={memo.memo_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-3.5 w-3.5 mr-1" /> View Memo
                                  </a>
                                </Button>
                              ) : memo.status === "sent" ? (
                                <Badge variant="secondary" className="text-xs text-green-600">Memo Sent</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">Declined</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Score submission dialog */}
      <Dialog open={!!scoreDialog} onOpenChange={(o) => !o && setScoreDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Your Score</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{scoreDialog?.title}</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Your Score</label>
              <Input
                type="number"
                min={0}
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                placeholder="e.g. 65"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Total Marks</label>
              <Input
                type="number"
                min={1}
                value={totalMarksInput}
                onChange={(e) => setTotalMarksInput(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
            <Button onClick={submitScore} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Submit Score
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PracticeExamsBrowser;
