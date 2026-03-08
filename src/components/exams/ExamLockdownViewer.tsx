import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Clock, FileText, Loader2, Maximize2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface ExamPaper {
  id: string;
  title: string;
  file_url: string | null;
  term: string;
  year: number;
  province: string;
}

interface ExamLockdownViewerProps {
  paper: ExamPaper;
  onClose: () => void;
  onSubmitScore: (score: number, totalMarks: number) => Promise<void>;
  alreadyCompleted: boolean;
}

const ExamLockdownViewer = ({ paper, onClose, onSubmitScore, alreadyCompleted }: ExamLockdownViewerProps) => {
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [totalMarksInput, setTotalMarksInput] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Prevent keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+P, F5, Ctrl+R
    if (
      (e.ctrlKey && ["c", "v", "a", "p", "r"].includes(e.key.toLowerCase())) ||
      e.key === "F5" ||
      (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i")
    ) {
      e.preventDefault();
      toast({ title: "Action blocked", description: "This action is disabled during the exam.", variant: "destructive" });
    }
    // Block Escape - show warning instead
    if (e.key === "Escape") {
      e.preventDefault();
      setShowExitWarning(true);
    }
  }, [toast]);

  // Prevent right-click
  const handleContextMenu = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // Prevent copy/paste
  const handleCopyPaste = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);

    // Lock body scroll
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown, handleContextMenu, handleCopyPaste]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSubmitScore = async () => {
    const score = parseInt(scoreInput);
    const total = parseInt(totalMarksInput);
    if (isNaN(score) || isNaN(total) || score < 0 || total <= 0 || score > total) {
      toast({ title: "Invalid score", description: "Please enter valid marks.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    await onSubmitScore(score, total);
    setSubmitting(false);
    setShowSubmitDialog(false);
  };

  const handleExit = () => {
    if (!alreadyCompleted) {
      setShowExitWarning(true);
    } else {
      onClose();
    }
  };

  const confirmExit = () => {
    setShowExitWarning(false);
    onClose();
  };

  // Build embedded PDF URL - add toolbar=0 to hide download options
  const pdfUrl = paper.file_url ? `${paper.file_url}#toolbar=0&navpanes=0&scrollbar=1` : null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col select-none" style={{ userSelect: "none" }}>
      {/* Lockdown header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{paper.title}</h2>
            <p className="text-xs text-muted-foreground">{paper.province} · {paper.term} · {paper.year}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-md">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono text-foreground">{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Lockdown indicator */}
          <div className="flex items-center gap-1.5 bg-destructive/10 px-3 py-1.5 rounded-md">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium text-destructive">Lockdown Mode</span>
          </div>

          {/* Submit button */}
          {!alreadyCompleted && (
            <Button size="sm" onClick={() => setShowSubmitDialog(true)}>
              <Send className="h-4 w-4 mr-1" /> Submit Score
            </Button>
          )}

          {/* Exit */}
          <Button size="sm" variant="ghost" onClick={handleExit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative overflow-hidden">
        {pdfUrl ? (
          <>
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={paper.title}
              sandbox="allow-same-origin allow-scripts"
              style={{ pointerEvents: "auto" }}
            />
            {/* Overlay to prevent right-click on iframe */}
            <div
              className="absolute inset-0"
              style={{ background: "transparent", pointerEvents: "none" }}
              onContextMenu={(e) => e.preventDefault()}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Exam paper not yet uploaded</p>
            <p className="text-sm text-muted-foreground">The admin hasn't uploaded the PDF for this paper yet.</p>
          </div>
        )}
      </div>

      {/* Score submission dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Your Score</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-1">{paper.title}</p>
          <p className="text-xs text-muted-foreground mb-4">Time spent: {formatTime(elapsedSeconds)}</p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Your Score</label>
              <Input type="number" min={0} value={scoreInput} onChange={(e) => setScoreInput(e.target.value)} placeholder="e.g. 65" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Total Marks</label>
              <Input type="number" min={1} value={totalMarksInput} onChange={(e) => setTotalMarksInput(e.target.value)} placeholder="e.g. 100" />
            </div>
            <Button onClick={handleSubmitScore} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Submit Score
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit warning dialog */}
      <Dialog open={showExitWarning} onOpenChange={setShowExitWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Leave Exam?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to leave? If you haven't submitted your score, your progress won't be saved.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowExitWarning(false)}>Continue Exam</Button>
            <Button variant="destructive" onClick={confirmExit}>Leave Exam</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default ExamLockdownViewer;
