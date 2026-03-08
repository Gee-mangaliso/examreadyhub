import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Ban, ShieldOff, AlertTriangle, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Restriction {
  id: string;
  user_id: string;
  restriction_type: string;
  reason: string | null;
  restricted_content_type: string | null;
  restricted_subject_id: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
}

const RestrictionsOverview = () => {
  const { toast } = useToast();
  const [restrictions, setRestrictions] = useState<(Restriction & { profile_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRestrictions = async () => {
    const { data } = await supabase
      .from("user_restrictions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const items = (data || []) as Restriction[];

    // Fetch profile names for the user_ids
    const userIds = [...new Set(items.map((r) => r.user_id))];
    let profiles: Profile[] = [];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      profiles = (profileData || []) as Profile[];
    }

    const enriched = items.map((r) => ({
      ...r,
      profile_name: profiles.find((p) => p.user_id === r.user_id)?.full_name || "Unknown",
    }));

    setRestrictions(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchRestrictions(); }, []);

  const liftRestriction = async (id: string) => {
    await supabase.from("user_restrictions").update({ is_active: false } as any).eq("id", id);
    toast({ title: "Restriction lifted" });
    fetchRestrictions();
  };

  const now = new Date();
  const active = restrictions.filter((r) => !r.ends_at || new Date(r.ends_at) > now);
  const expired = restrictions.filter((r) => r.ends_at && new Date(r.ends_at) <= now);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading restrictions…</div>;
  }

  const bans = active.filter((r) => r.restriction_type === "ban");
  const contentRestrictions = active.filter((r) => r.restriction_type === "content_restriction");

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-heading text-foreground flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        Active Restrictions & Bans ({active.length})
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Ban className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Active Bans</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{bans.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <ShieldOff className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-muted-foreground">Content Restrictions</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{contentRestrictions.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Recently Expired</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{expired.length}</div>
        </div>
      </div>

      {active.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No active restrictions or bans.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.profile_name}</TableCell>
                  <TableCell>
                    <Badge variant={r.restriction_type === "ban" ? "destructive" : "secondary"} className="text-xs">
                      {r.restriction_type === "ban" ? "Ban" : "Content Restriction"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="space-y-0.5">
                      {r.restricted_content_type && (
                        <span className="text-xs text-muted-foreground block">{r.restricted_content_type}</span>
                      )}
                      {r.reason && <p className="text-xs text-foreground truncate">{r.reason}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {r.ends_at ? format(new Date(r.ends_at), "MMM d, yyyy HH:mm") : "Permanent"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => liftRestriction(r.id)} className="text-xs gap-1">
                      <X className="h-3 w-3" /> Lift
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Expired section */}
      {expired.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Recently Expired (still marked active)</h4>
          <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden opacity-60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expired</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expired.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-foreground">{r.profile_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.restriction_type === "ban" ? "Ban" : "Restriction"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.ends_at && format(new Date(r.ends_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => liftRestriction(r.id)} className="text-xs gap-1">
                        <X className="h-3 w-3" /> Clear
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestrictionsOverview;
