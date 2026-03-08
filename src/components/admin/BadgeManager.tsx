import { useState, useEffect } from "react";
import { Award, Plus, Trash2, Pencil, Save, UserPlus, Zap, Flame, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BadgeDef {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  badge_type: string;
  criteria_value: number | null;
  created_at: string;
}

interface Student { user_id: string; full_name: string; email: string }

const iconMap: Record<string, any> = { award: Award, zap: Zap, flame: Flame, trophy: Trophy, "trending-up": TrendingUp };

const BadgeManager = () => {
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<BadgeDef | null>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "award", badge_type: "manual", criteria_value: "" });

  // Award dialog
  const [awardDialog, setAwardDialog] = useState(false);
  const [awardBadge, setAwardBadge] = useState<BadgeDef | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  useEffect(() => {
    supabase.from("badges").select("*").order("created_at")
      .then(({ data }) => { setBadges(data || []); setLoading(false); });
  }, []);

  const saveBadge = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = {
      name: form.name,
      description: form.description || null,
      icon: form.icon,
      badge_type: form.badge_type,
      criteria_value: form.criteria_value ? parseInt(form.criteria_value) : null,
    };
    if (editing) {
      const { error } = await supabase.from("badges").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setBadges((p) => p.map((b) => (b.id === editing.id ? { ...b, ...payload } : b)));
    } else {
      const { data, error } = await supabase.from("badges").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setBadges((p) => [...p, data as BadgeDef]);
    }
    toast({ title: editing ? "Badge updated" : "Badge created" });
    setDialog(false);
  };

  const deleteBadge = async (id: string) => {
    await supabase.from("badges").delete().eq("id", id);
    setBadges((p) => p.filter((b) => b.id !== id));
    toast({ title: "Badge deleted" });
  };

  const openAward = async (badge: BadgeDef) => {
    setAwardBadge(badge);
    setSelectedStudent("");
    if (students.length === 0) {
      const { data } = await supabase.rpc("admin_get_all_students");
      if (data) setStudents(data.map((s: any) => ({ user_id: s.user_id, full_name: s.full_name, email: s.email })));
    }
    setAwardDialog(true);
  };

  const awardToStudent = async () => {
    if (!selectedStudent || !awardBadge) return;
    const { error } = await supabase.from("user_badges").insert({
      user_id: selectedStudent,
      badge_id: awardBadge.id,
      week_start: new Date().toISOString().split("T")[0],
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Badge awarded!" });
    setAwardDialog(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading badges…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-foreground">Badge Management</h2>
        <Button onClick={() => { setEditing(null); setForm({ name: "", description: "", icon: "award", badge_type: "manual", criteria_value: "" }); setDialog(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Create Badge
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {badges.map((b) => {
          const IconComp = iconMap[b.icon] || Award;
          return (
            <div key={b.id} className="bg-card border border-border rounded-lg p-5 shadow-card">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconComp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openAward(b)}>
                    <UserPlus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                    setEditing(b);
                    setForm({ name: b.name, description: b.description || "", icon: b.icon, badge_type: b.badge_type, criteria_value: b.criteria_value?.toString() || "" });
                    setDialog(true);
                  }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteBadge(b.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <h3 className="font-medium text-foreground">{b.name}</h3>
              {b.description && <p className="text-sm text-muted-foreground mt-1">{b.description}</p>}
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{b.badge_type}</Badge>
                {b.criteria_value && <Badge variant="outline" className="text-xs">≥ {b.criteria_value}</Badge>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge Form Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Badge" : "Create Badge"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm((p) => ({ ...p, icon: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(iconMap).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.badge_type} onValueChange={(v) => setForm((p) => ({ ...p, badge_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (admin-assigned)</SelectItem>
                  <SelectItem value="weekly_quizzes">Weekly quiz count</SelectItem>
                  <SelectItem value="streak">Study streak</SelectItem>
                  <SelectItem value="weekly_avg">Weekly avg score</SelectItem>
                  <SelectItem value="improvement">Weekly improvement %</SelectItem>
                  <SelectItem value="total_quizzes">Total quizzes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.badge_type !== "manual" && (
              <div className="space-y-2"><Label>Criteria Value</Label><Input type="number" value={form.criteria_value} onChange={(e) => setForm((p) => ({ ...p, criteria_value: e.target.value }))} /></div>
            )}
            <Button onClick={saveBadge} className="w-full"><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Create"} Badge</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Award Dialog */}
      <Dialog open={awardDialog} onOpenChange={setAwardDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Award "{awardBadge?.name}" Badge</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue placeholder="Choose a student…" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name} ({s.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={awardToStudent} disabled={!selectedStudent} className="w-full">
              <Award className="h-4 w-4 mr-1" /> Award Badge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BadgeManager;
