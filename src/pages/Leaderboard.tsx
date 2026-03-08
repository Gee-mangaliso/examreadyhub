import { useState, useEffect } from "react";
import { Trophy, Medal, Crown, Users, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_score: number;
  total_questions: number;
  quizzes_taken: number;
  avg_percentage: number;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>;
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const Leaderboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", { limit_count: 50 });
      if (!error && data) setEntries(data as LeaderboardEntry[]);
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const userRank = user ? entries.findIndex((e) => e.user_id === user.id) + 1 : 0;

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading text-foreground">Leaderboard</h1>
              <p className="text-muted-foreground mt-2">Top quiz performers across all subjects</p>
            </div>

            {/* Stats summary */}
            {entries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-card border border-border rounded-lg p-4 text-center shadow-card">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <div className="text-2xl font-bold text-foreground">{entries.length}</div>
                  <p className="text-xs text-muted-foreground">Participants</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center shadow-card">
                  <TrendingUp className="h-5 w-5 text-accent mx-auto mb-1" />
                  <div className="text-2xl font-bold text-foreground">
                    {entries.reduce((sum, e) => sum + e.quizzes_taken, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Quizzes Taken</p>
                </div>
                {userRank > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4 text-center shadow-card col-span-2 sm:col-span-1">
                    <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-foreground">#{userRank}</div>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard table */}
            <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-muted-foreground">Loading leaderboard…</div>
              ) : entries.length === 0 ? (
                <div className="p-12 text-center">
                  <Trophy className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No quiz attempts yet. Be the first!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Header row */}
                  <div className="grid grid-cols-[48px_1fr_80px_80px_100px] sm:grid-cols-[48px_1fr_100px_100px_120px] items-center px-4 py-3 bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">#</span>
                    <span className="text-xs font-medium text-muted-foreground">Student</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">Score</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">Quizzes</span>
                    <span className="text-xs font-medium text-muted-foreground text-center">Avg %</span>
                  </div>
                  {entries.map((entry, i) => {
                    const rank = i + 1;
                    const isCurrentUser = user?.id === entry.user_id;
                    return (
                      <div
                        key={entry.user_id}
                        className={`grid grid-cols-[48px_1fr_80px_80px_100px] sm:grid-cols-[48px_1fr_100px_100px_120px] items-center px-4 py-3 transition-colors ${
                          isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center justify-center">{getRankIcon(rank)}</div>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={entry.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(entry.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground truncate">
                            {entry.full_name}
                            {isCurrentUser && <span className="text-xs text-primary ml-1">(You)</span>}
                          </span>
                        </div>
                        <div className="text-center text-sm font-semibold text-foreground">
                          {entry.total_score}/{entry.total_questions}
                        </div>
                        <div className="text-center text-sm text-muted-foreground">{entry.quizzes_taken}</div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium text-foreground">{entry.avg_percentage}%</span>
                          <Progress value={entry.avg_percentage} className="h-1.5 w-full max-w-[80px]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Leaderboard;
