import { useState, useEffect } from "react";
import { Calendar, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Snapshot {
  user_id: string;
  rank: number;
  total_score: number;
  avg_percentage: number;
  weekly_quizzes: number;
  weekly_avg: number | null;
  current_streak: number;
  week_start: string;
}

interface SnapshotWithProfile extends Snapshot {
  full_name: string;
  avatar_url: string | null;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const WeeklyComparison = () => {
  const { user, isAdmin } = useAuth();
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [snapshots, setSnapshots] = useState<SnapshotWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeks = async () => {
      const { data } = await supabase
        .from("leaderboard_snapshots")
        .select("week_start")
        .order("week_start", { ascending: false });
      if (data) {
        const unique = [...new Set(data.map((d: any) => d.week_start))];
        setWeeks(unique);
        if (unique.length > 0) setSelectedWeek(unique[0]);
      }
      setLoading(false);
    };
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    const fetchSnapshots = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leaderboard_snapshots")
        .select("*")
        .eq("week_start", selectedWeek)
        .order("rank");

      if (data && data.length > 0) {
        const userIds = data.map((s: any) => s.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = (profiles || []).reduce<Record<string, any>>((acc, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});

        let enriched = data.map((s: any) => ({
          ...s,
          full_name: profileMap[s.user_id]?.full_name || "Anonymous",
          avatar_url: profileMap[s.user_id]?.avatar_url || null,
        }));

        // Learner view: top 3 + self
        if (!isAdmin && user) {
          const top3 = enriched.slice(0, 3);
          const me = enriched.find((s: any) => s.user_id === user.id);
          if (me && !top3.some((s: any) => s.user_id === user.id)) {
            enriched = [...top3, me];
          } else {
            enriched = top3;
          }
        }

        setSnapshots(enriched);
      } else {
        setSnapshots([]);
      }
      setLoading(false);
    };
    fetchSnapshots();
  }, [selectedWeek, user, isAdmin]);

  // Get previous week's data for comparison
  const currentWeekIdx = weeks.indexOf(selectedWeek);
  const prevWeek = currentWeekIdx >= 0 && currentWeekIdx < weeks.length - 1 ? weeks[currentWeekIdx + 1] : null;
  const [prevSnapshots, setPrevSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    if (!prevWeek) { setPrevSnapshots([]); return; }
    supabase
      .from("leaderboard_snapshots")
      .select("*")
      .eq("week_start", prevWeek)
      .order("rank")
      .then(({ data }) => setPrevSnapshots((data || []) as Snapshot[]));
  }, [prevWeek]);

  const formatWeek = (ws: string) => {
    const d = new Date(ws + "T00:00:00Z");
    return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  if (loading && weeks.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center shadow-card">
        <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No weekly snapshots yet. Snapshots are saved weekly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {weeks.length > 0 && (
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[220px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((w) => (
                <SelectItem key={w} value={w}>{formatWeek(w)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {snapshots.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center shadow-card">
          <p className="text-muted-foreground text-sm">No data for this week.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden divide-y divide-border">
          {snapshots.map((s, i) => {
            const prevEntry = prevSnapshots.find((p) => p.user_id === s.user_id);
            const rankChange = prevEntry ? prevEntry.rank - s.rank : 0;
            const isCurrentUser = user?.id === s.user_id;
            const showSep = i > 0 && s.rank > snapshots[i - 1].rank + 1;

            return (
              <div key={s.user_id}>
                {showSep && (
                  <div className="flex items-center justify-center py-2 text-muted-foreground text-xs gap-2">
                    <span className="h-px flex-1 bg-border" />
                    <span>•••</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className={`flex items-center gap-4 px-4 py-3 ${isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"}`}>
                  <span className="text-sm font-bold text-muted-foreground w-8 text-center">#{s.rank}</span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={s.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(s.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {s.full_name} {isCurrentUser && <span className="text-xs text-primary">(You)</span>}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{s.avg_percentage}% avg</span>
                      <span className="text-xs text-muted-foreground">· {s.weekly_quizzes} quizzes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {rankChange > 0 && (
                      <Badge variant="secondary" className="text-xs gap-0.5 text-green-600">
                        <ArrowUpRight className="h-3 w-3" /> +{rankChange}
                      </Badge>
                    )}
                    {rankChange < 0 && (
                      <Badge variant="secondary" className="text-xs gap-0.5 text-red-500">
                        <ArrowDownRight className="h-3 w-3" /> {rankChange}
                      </Badge>
                    )}
                    {rankChange === 0 && prevEntry && (
                      <Badge variant="outline" className="text-xs gap-0.5">
                        <Minus className="h-3 w-3" /> Same
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeeklyComparison;
