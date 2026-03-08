import { useState, useEffect } from "react";
import {
  Trophy, Medal, Crown, Users, TrendingUp, TrendingDown, Minus,
  Flame, Zap, Award,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  current_streak: number;
  weekly_quizzes: number;
  weekly_avg: number | null;
  prev_weekly_avg: number | null;
  trend: string;
  badge_count: number;
}

interface UserBadge {
  id: string;
  user_id: string;
  awarded_at: string;
  badges: { name: string; icon: string; description: string | null } | null;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>;
};

const getTrendIcon = (trend: string) => {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const getTrendLabel = (trend: string) => {
  if (trend === "improving") return "Improving";
  if (trend === "declining") return "Needs attention";
  return "Stable";
};

const iconMap: Record<string, any> = { award: Award, zap: Zap, flame: Flame, trophy: Trophy, "trending-up": TrendingUp };

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const Leaderboard = () => {
  const { user, isAdmin } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [recentBadges, setRecentBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [leaderboardRes, badgesRes] = await Promise.all([
        supabase.rpc("get_enhanced_leaderboard", { limit_count: 50 }),
        supabase.from("user_badges").select("*, badges(name, icon, description)").order("awarded_at", { ascending: false }).limit(10),
      ]);
      if (!leaderboardRes.error && leaderboardRes.data) setEntries(leaderboardRes.data as LeaderboardEntry[]);
      if (!badgesRes.error && badgesRes.data) setRecentBadges(badgesRes.data as UserBadge[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const userRank = user ? entries.findIndex((e) => e.user_id === user.id) + 1 : 0;

  // For learners: show top 3 + current user; for admins: show all
  const filterForLearner = (list: LeaderboardEntry[]) => {
    if (isAdmin) return list;
    const top3 = list.slice(0, 3);
    const currentUser = user ? list.find((e) => e.user_id === user.id) : null;
    if (currentUser && !top3.some((e) => e.user_id === currentUser.user_id)) {
      return [...top3, currentUser];
    }
    return top3;
  };

  const topEngaged = filterForLearner([...entries].sort((a, b) => b.weekly_quizzes - a.weekly_quizzes));
  const consistentLearners = (() => {
    const all = [...entries].filter((e) => e.current_streak >= 2).sort((a, b) => b.current_streak - a.current_streak);
    return isAdmin ? all : filterForLearner(all);
  })();
  const overallEntries = filterForLearner(entries);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading text-foreground">Leaderboard</h1>
              <p className="text-muted-foreground mt-2">Track engagement, consistency, and improvement</p>
            </div>

            {/* Stats summary */}
            {entries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-card border border-border rounded-lg p-4 text-center shadow-card">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <div className="text-2xl font-bold text-foreground">{entries.length}</div>
                  <p className="text-xs text-muted-foreground">Participants</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center shadow-card">
                  <Zap className="h-5 w-5 text-accent mx-auto mb-1" />
                  <div className="text-2xl font-bold text-foreground">
                    {entries.reduce((sum, e) => sum + e.weekly_quizzes, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Quizzes This Week</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center shadow-card">
                  <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-foreground">
                    {Math.max(0, ...entries.map((e) => e.current_streak))}
                  </div>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
                {userRank > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4 text-center shadow-card">
                    <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-foreground">#{userRank}</div>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="engagement" className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1 rounded-lg mb-6">
                <TabsTrigger value="engagement">Most Engaged</TabsTrigger>
                <TabsTrigger value="consistency">Consistency</TabsTrigger>
                <TabsTrigger value="overall">Overall Scores</TabsTrigger>
                <TabsTrigger value="badges">Badges</TabsTrigger>
              </TabsList>

              {/* MOST ENGAGED TAB */}
              <TabsContent value="engagement">
                <LeaderboardTable entries={topEngaged} user={user} showWeekly />
              </TabsContent>

              {/* CONSISTENCY TAB */}
              <TabsContent value="consistency">
                {consistentLearners.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
                    <Flame className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No active streaks yet. Start studying daily!</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden divide-y divide-border">
                    {consistentLearners.map((entry, i) => {
                      const isCurrentUser = user?.id === entry.user_id;
                      return (
                        <div key={entry.user_id} className={`flex items-center gap-4 px-4 py-4 ${isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"}`}>
                          <div className="flex items-center justify-center w-8">{getRankIcon(i + 1)}</div>
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={entry.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(entry.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate block">
                              {entry.full_name} {isCurrentUser && <span className="text-xs text-primary">(You)</span>}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Flame className="h-3 w-3 text-orange-500" /> {entry.current_streak} day streak
                              </Badge>
                              {getTrendIcon(entry.trend)}
                              <span className="text-xs text-muted-foreground">{getTrendLabel(entry.trend)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">{entry.weekly_quizzes} quizzes</div>
                            <div className="text-xs text-muted-foreground">this week</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* OVERALL SCORES TAB */}
              <TabsContent value="overall">
                <LeaderboardTable entries={overallEntries} user={user} showWeekly={false} />
              </TabsContent>

              {/* BADGES TAB */}
              <TabsContent value="badges">
                {recentBadges.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
                    <Award className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No badges awarded yet. Keep studying!</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden divide-y divide-border">
                    {recentBadges.map((ub) => {
                      const IconComp = iconMap[ub.badges?.icon || "award"] || Award;
                      const isCurrentUser = user?.id === ub.user_id;
                      // Find name from entries
                      const entry = entries.find((e) => e.user_id === ub.user_id);
                      return (
                        <div key={ub.id} className={`flex items-center gap-4 px-4 py-4 ${isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComp className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{ub.badges?.name}</span>
                            {ub.badges?.description && <p className="text-xs text-muted-foreground">{ub.badges.description}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-sm text-foreground">{entry?.full_name || "Student"}</span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ub.awarded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

// Reusable leaderboard table
const LeaderboardTable = ({
  entries, user, showWeekly, allEntries,
}: { entries: LeaderboardEntry[]; user: any; showWeekly: boolean; allEntries?: LeaderboardEntry[] }) => {
  // Build a rank map from allEntries (full sorted list) so ranks are accurate
  const rankSource = allEntries || entries;
  if (entries.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
        <Trophy className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">No quiz attempts yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="divide-y divide-border">
        {/* Header */}
        <div className="grid grid-cols-[48px_1fr_80px_80px_100px] sm:grid-cols-[48px_1fr_100px_80px_100px_80px] items-center px-4 py-3 bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">#</span>
          <span className="text-xs font-medium text-muted-foreground">Student</span>
          <span className="text-xs font-medium text-muted-foreground text-center">Score</span>
          {showWeekly && <span className="text-xs font-medium text-muted-foreground text-center hidden sm:block">Weekly</span>}
          <span className="text-xs font-medium text-muted-foreground text-center">Avg %</span>
          <span className="text-xs font-medium text-muted-foreground text-center hidden sm:block">Trend</span>
        </div>
        {entries.map((entry, i) => {
          const actualRank = rankSource.findIndex((e) => e.user_id === entry.user_id) + 1;
          const isCurrentUser = user?.id === entry.user_id;
          const showSeparator = i > 0 && actualRank > (rankSource.findIndex((e) => e.user_id === entries[i - 1].user_id) + 1) + 1;
          return (
            <div key={entry.user_id}>
              {showSeparator && (
                <div className="flex items-center justify-center py-2 text-muted-foreground text-xs gap-2">
                  <span className="h-px flex-1 bg-border" />
                  <span>•••</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div
                className={`grid grid-cols-[48px_1fr_80px_80px_100px] sm:grid-cols-[48px_1fr_100px_80px_100px_80px] items-center px-4 py-3 transition-colors ${
                  isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-center">{getRankIcon(actualRank)}</div>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(entry.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {entry.full_name}
                      {isCurrentUser && <span className="text-xs text-primary ml-1">(You)</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      {entry.current_streak > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 gap-0.5">
                          <Flame className="h-2.5 w-2.5 text-orange-500" />{entry.current_streak}
                        </Badge>
                      )}
                      {entry.badge_count > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
                          <Award className="h-2.5 w-2.5" />{entry.badge_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-center text-sm font-semibold text-foreground">
                  {entry.total_score}/{entry.total_questions}
                </div>
                {showWeekly && (
                  <div className="text-center text-sm text-muted-foreground hidden sm:block">
                    {entry.weekly_quizzes}
                  </div>
                )}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-medium text-foreground">{entry.avg_percentage}%</span>
                  <Progress value={entry.avg_percentage} className="h-1.5 w-full max-w-[80px]" />
                </div>
                <div className="hidden sm:flex items-center justify-center gap-1">
                  {getTrendIcon(entry.trend)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
