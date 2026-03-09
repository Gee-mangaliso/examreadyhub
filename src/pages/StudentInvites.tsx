import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface InviteRow {
  id: string;
  teacher_id: string;
  status: string;
  message: string | null;
  created_at: string;
  teacher_name?: string;
}

const StudentInvites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("teacher_invites").select("*").eq("student_id", user.id).order("created_at", { ascending: false });
      // Fetch teacher names
      const teacherIds = [...new Set((data || []).map((d: any) => d.teacher_id))];
      let teacherNames: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
        (profiles || []).forEach((p: any) => { teacherNames[p.user_id] = p.full_name; });
      }
      setInvites((data || []).map((d: any) => ({ ...d, teacher_name: teacherNames[d.teacher_id] || "Unknown Teacher" })));
      setLoading(false);
    };
    fetch();
  }, [user]);

  const respond = async (inviteId: string, teacherId: string, accept: boolean) => {
    const status = accept ? "accepted" : "declined";
    await supabase.from("teacher_invites").update({ status, responded_at: new Date().toISOString() }).eq("id", inviteId);
    
    if (accept) {
      // Create teacher_students link
      await supabase.from("teacher_students").insert({ teacher_id: teacherId, student_id: user!.id });
    }

    setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, status } : i));
    toast({ title: accept ? "Invite accepted!" : "Invite declined" });
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-10 px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-heading text-foreground mb-2">Teacher Invites</h1>
            <p className="text-muted-foreground mb-8">Manage collaboration invites from teachers</p>
            
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : invites.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No invites received yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invites.map((inv) => (
                  <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-card space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{inv.teacher_name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy 'at' HH:mm")}</p>
                      </div>
                      <Badge variant={inv.status === "accepted" ? "default" : inv.status === "declined" ? "destructive" : "secondary"}>
                        {inv.status}
                      </Badge>
                    </div>
                    {inv.message && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{inv.message}</p>}
                    {inv.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respond(inv.id, inv.teacher_id, true)}>
                          <CheckCircle className="h-4 w-4 mr-1" />Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respond(inv.id, inv.teacher_id, false)}>
                          <XCircle className="h-4 w-4 mr-1" />Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default StudentInvites;
