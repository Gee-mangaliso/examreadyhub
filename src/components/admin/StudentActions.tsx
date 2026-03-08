import { useState, useEffect } from "react";
import { format, addDays, addHours } from "date-fns";
import {
  Ban, Trash2, ShieldOff, Clock, AlertTriangle, BookOpen, X, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Restriction {
  id: string;
  restriction_type: string;
  reason: string | null;
  restricted_content_type: string | null;
  restricted_subject_id: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Props {
  studentId: string;
  studentName: string;
  onDeleted?: () => void;
}

const StudentActions = ({ studentId, studentName, onDeleted }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Restrictions
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loadingRestrictions, setLoadingRestrictions] = useState(true);

  // Ban dialog
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const [banCustomDays, setBanCustomDays] = useState("7");
  const [banSubmitting, setBanSubmitting] = useState(false);

  // Restrict dialog
  const [restrictOpen, setRestrictOpen] = useState(false);
  const [restrictReason, setRestrictReason] = useState("");
  const [restrictType, setRestrictType] = useState("quizzes");
  const [restrictSubject, setRestrictSubject] = useState("");
  const [restrictDuration, setRestrictDuration] = useState("24h");
  const [restrictCustomDays, setRestrictCustomDays] = useState("3");
  const [restrictSubmitting, setRestrictSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    fetchRestrictions();
    supabase.from("subjects").select("id, name").order("name").then(({ data }) => {
      setSubjects((data || []) as Subject[]);
    });
  }, [studentId]);

  const fetchRestrictions = async () => {
    const { data } = await supabase
      .from("user_restrictions")
      .select("*")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false });
    setRestrictions((data || []) as Restriction[]);
    setLoadingRestrictions(false);
  };

  const getEndDate = (duration: string, customDays: string): string | null => {
    if (duration === "permanent") return null;
    if (duration === "24h") return addHours(new Date(), 24).toISOString();
    if (duration === "3d") return addDays(new Date(), 3).toISOString();
    if (duration === "7d") return addDays(new Date(), 7).toISOString();
    if (duration === "30d") return addDays(new Date(), 30).toISOString();
    if (duration === "custom") return addDays(new Date(), parseInt(customDays) || 7).toISOString();
    return null;
  };

  const handleBan = async () => {
    if (!user) return;
    setBanSubmitting(true);
    const endsAt = getEndDate(banDuration, banCustomDays);

    const { error } = await supabase.from("user_restrictions").insert({
      user_id: studentId,
      restriction_type: "ban",
      reason: banReason.trim() || null,
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
      created_by: user.id,
      is_active: true,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account banned", description: `${studentName} has been banned.` });
      // Notify the student
      await supabase.rpc("create_notification", {
        _user_id: studentId,
        _type: "account_action",
        _title: "Account Suspended ⚠️",
        _message: `Your account has been suspended${banReason ? `: ${banReason}` : "."}${endsAt ? ` Until ${format(new Date(endsAt), "MMM d, yyyy HH:mm")}.` : " Contact admin for more information."}`,
        _metadata: JSON.stringify({}),
      });
      fetchRestrictions();
    }
    setBanSubmitting(false);
    setBanOpen(false);
    setBanReason("");
    setBanDuration("permanent");
  };

  const handleRestrict = async () => {
    if (!user) return;
    setRestrictSubmitting(true);
    const endsAt = getEndDate(restrictDuration, restrictCustomDays);

    const { error } = await supabase.from("user_restrictions").insert({
      user_id: studentId,
      restriction_type: "content_restriction",
      reason: restrictReason.trim() || null,
      restricted_content_type: restrictType,
      restricted_subject_id: restrictSubject || null,
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
      created_by: user.id,
      is_active: true,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Restriction added", description: `Content restriction applied to ${studentName}.` });
      await supabase.rpc("create_notification", {
        _user_id: studentId,
        _type: "account_action",
        _title: "Content Access Restricted ⚠️",
        _message: `Your access to ${restrictType} has been restricted${restrictReason ? `: ${restrictReason}` : "."}${endsAt ? ` Until ${format(new Date(endsAt), "MMM d, yyyy HH:mm")}.` : ""}`,
        _metadata: JSON.stringify({}),
      });
      fetchRestrictions();
    }
    setRestrictSubmitting(false);
    setRestrictOpen(false);
    setRestrictReason("");
  };

  const handleDelete = async () => {
    setDeleteSubmitting(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: studentId }),
      }
    );

    const result = await res.json();
    if (!res.ok) {
      toast({ title: "Error", description: result.error || "Failed to delete", variant: "destructive" });
    } else {
      toast({ title: "Student deleted", description: `${studentName}'s account has been permanently removed.` });
      onDeleted?.();
    }
    setDeleteSubmitting(false);
    setDeleteOpen(false);
  };

  const liftRestriction = async (id: string) => {
    await supabase.from("user_restrictions").update({ is_active: false } as any).eq("id", id);
    toast({ title: "Restriction lifted" });
    fetchRestrictions();
  };

  const activeRestrictions = restrictions.filter((r) => {
    if (!r.is_active) return false;
    if (r.ends_at && new Date(r.ends_at) < new Date()) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-yellow-600 border-yellow-600/30 hover:bg-yellow-500/10" onClick={() => setRestrictOpen(true)}>
          <ShieldOff className="h-3.5 w-3.5" /> Restrict Content
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-orange-600 border-orange-600/30 hover:bg-orange-500/10" onClick={() => setBanOpen(true)}>
          <Ban className="h-3.5 w-3.5" /> Ban Account
        </Button>
        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete Account
        </Button>
      </div>

      {/* Active restrictions */}
      {activeRestrictions.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Active Restrictions ({activeRestrictions.length})
          </h4>
          {activeRestrictions.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 bg-card p-3 rounded-md border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={r.restriction_type === "ban" ? "destructive" : "secondary"} className="text-xs">
                    {r.restriction_type === "ban" ? "Banned" : "Restricted"}
                  </Badge>
                  {r.restricted_content_type && (
                    <span className="text-xs text-muted-foreground">{r.restricted_content_type}</span>
                  )}
                </div>
                {r.reason && <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {r.ends_at ? `Expires ${format(new Date(r.ends_at), "MMM d, yyyy HH:mm")}` : "Permanent"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => liftRestriction(r.id)} className="text-xs shrink-0">
                <X className="h-3 w-3 mr-1" /> Lift
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Ban Dialog */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Ban className="h-5 w-5" /> Ban {studentName}
            </DialogTitle>
            <DialogDescription>
              This will prevent the student from accessing the platform. They will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Reason for banning..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {banDuration === "custom" && (
              <div className="space-y-2">
                <Label>Number of days</Label>
                <Input type="number" min="1" value={banCustomDays} onChange={(e) => setBanCustomDays(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBan} disabled={banSubmitting}>
              {banSubmitting ? "Banning..." : "Ban Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restrict Dialog */}
      <Dialog open={restrictOpen} onOpenChange={setRestrictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-yellow-600" /> Restrict {studentName}
            </DialogTitle>
            <DialogDescription>
              Limit the student's access to specific content types for a set period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Content Type to Restrict</Label>
              <Select value={restrictType} onValueChange={setRestrictType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quizzes">Quizzes</SelectItem>
                  <SelectItem value="exam_papers">Exam Papers</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="slides">Slides</SelectItem>
                  <SelectItem value="study_guides">Study Guides</SelectItem>
                  <SelectItem value="worked_examples">Worked Examples</SelectItem>
                  <SelectItem value="all_content">All Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject (optional — leave empty for all subjects)</Label>
              <Select value={restrictSubject} onValueChange={setRestrictSubject}>
                <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={restrictDuration} onValueChange={setRestrictDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {restrictDuration === "custom" && (
              <div className="space-y-2">
                <Label>Number of days</Label>
                <Input type="number" min="1" value={restrictCustomDays} onChange={(e) => setRestrictCustomDays(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={restrictReason} onChange={(e) => setRestrictReason(e.target.value)} placeholder="Reason for restricting..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestrictOpen(false)}>Cancel</Button>
            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleRestrict} disabled={restrictSubmitting}>
              {restrictSubmitting ? "Applying..." : "Apply Restriction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete {studentName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the student's account and all their data including quiz history, progress, and badges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentActions;
