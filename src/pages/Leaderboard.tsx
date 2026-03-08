import { useState, useEffect, useRef } from "react";
import {
  Trophy, Medal, Crown, Users, TrendingUp, TrendingDown, Minus,
  Flame, Zap, Award, Filter, Sparkles, History,
} from "lucide-react";
import WeeklyComparison from "@/components/leaderboard/WeeklyComparison";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface SubjectOption {
  id: string;
  name: string;
}

const getRankIcon = (rank: number, animated = false) => {
  const baseClass = animated ? "animate-[scale-in_0.4s_ease-out]" : "";
  if (rank === 1) return <Crown className={`h-6 w-6 text-yellow-500 ${baseClass}`} />;
  if (rank === 2) return <Medal className={`h-6 w-6 text-gray-400 ${baseClass}`} />;
  if (rank === 3) return <Medal className={`h-6 w-6 text-amber-600 ${baseClass}`} />;
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

const getRankGlow = (rank: number, isCurrentUser: boolean) => {
  if (!isCurrentUser || rank > 3) return "";
  if (rank === 1) return "ring-2 ring-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.15)]";
  if (rank === 2) return "ring-2 ring-gray-400/30 shadow-[0_0_15px_rgba(156,163,175,0.15)]";
  return "ring-2 ring-amber-600/30 shadow-[0_0_15px_rgba(217,119,6,0.15)]";
};

const fireConfetti = () => {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#fbbf24", "#f59e0b", "#d97706", "#10b981", "#6366f1"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#fbbf24", "#f59e0b", "#d97706", "#10b981", "#6366f1"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
};

const Leaderboard = () => {
  const { user, isAdmin } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [recentBadges, setRecentBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledSubjects, setEnrolledSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [showTopBanner, setShowTopBanner] = useState(false);
  const confettiFired = useRef(false);

  // Fetch enrolled subjects for the filter
  useEffect(() => {
    if (!user || isAdmin) return;
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("user_subjects")
        .select("subject_id, subjects(id, name)")
        .eq("user_id", user.id);
      if (data) {
        const subjects = data
          .map((d: any) => d.subjects)
          .filter(Boolean) as SubjectOption[];
        setEnrolledSubjects(subjects);
      }
    };
    fetchSubjects();
  }, [user, isAdmin]);

  // For admin, fetch all subjects
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAllSubjects = async () => {
      const { data } = await supabase.from("subjects").select("id, name").order("name");
      if (data) setEnrolledSubjects(data);
    };
    fetchAllSubjects();
  }, [isAdmin]);

  // Fetch leaderboard data based on selected subject
  useEffect(() => {
    confettiFired.current = false;
    const fetchData = async () => {
      setLoading(true);
      const leaderboardPromise = selectedSubject === "all"
        ? supabase.rpc("get_enhanced_leaderboard", { limit_count: 50 })
        : supabase.rpc("get_subject_leaderboard" as any, { _subject_id: selectedSubject, limit_count: 50 });

      const [leaderboardRes, badgesRes] = await Promise.all([
        leaderboardPromise,
        supabase.from("user_badges").select("*, badges(name, icon, description)").order("awarded_at", { ascending: false }).limit(10),
      ]);
      if (!leaderboardRes.error && leaderboardRes.data) setEntries(leaderboardRes.data as LeaderboardEntry[]);
      else setEntries([]);
      if (!badgesRes.error && badgesRes.data) setRecentBadges(badgesRes.data as UserBadge[]);
      setLoading(false);
    };
    fetchData();
  }, [selectedSubject]);

  // Fire confetti when user is in top 3
  useEffect(() => {
    if (!user || entries.length === 0 || confettiFired.current) return;
    const rank = entries.findIndex((e) => e.user_id === user.id) + 1;
    if (rank >= 1 && rank <= 3) {
      confettiFired.current = true;
      setShowTopBanner(true);
      setTimeout(() => fireConfetti(), 500);
      setTimeout(() => setShowTopBanner(false), 5000);
    }
  }, [entries, user]);

  const userRank = user ? entries.findIndex((e) => e.user_id === user.id) + 1 : 0;

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

  const subjectName = selectedSubject !== "all"
    ? enrolledSubjects.find((s) => s.id === selectedSubject)?.name
    : null;

  const rankLabel = userRank === 1 ? "🥇 1st Place!" : userRank === 2 ? "🥈 2nd Place!" : "🥉 3rd Place!";

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        {/* Top 3 celebration banner */}
        <AnimatePresence>
          {showTopBanner && userRank >= 1 && userRank <= 3 && (
            <motion.div
              initial={{ opacity: 0, y: -60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-yellow-500/90 via-amber-500/90 to-yellow-500/90 text-white shadow-lg"
            >
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="font-bold text-lg">{rankLabel}</span>
              <span className="text-sm opacity-90">You&apos;re in the top 3!</span>
              <Sparkles className="h-5 w-5 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading text-foreground">Leaderboard</h1>
              <p className="text-muted-foreground mt-2">
                {subjectName
                  ? `Rankings for ${subjectName}`
                  : "Track engagement, consistency, and improvement"}
              </p>
            </motion.div>

            {/* Subject Filter */}
            {enrolledSubjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex items-center justify-center gap-3 mb-8"
              >
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-[240px] bg-card border-border">
                    <SelectValue placeholder="Filter by subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {enrolledSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}

            {/* Stats summary */}
            {entries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Users, color: "text-primary", value: entries.length, label: "Participants" },
                  { icon: Zap, color: "text-accent", value: entries.reduce((sum, e) => sum + e.weekly_quizzes, 0), label: "Quizzes This Week" },
                  { icon: Flame, color: "text-orange-500", value: Math.max(0, ...entries.map((e) => e.current_streak)), label: "Best Streak" },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx, duration: 0.4 }}
                    className="bg-card border border-border rounded-lg p-4 text-center shadow-card"
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-1`} />
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
                {userRank > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className={`bg-card border border-border rounded-lg p-4 text-center shadow-card ${
                      userRank <= 3 ? "ring-2 ring-yellow-500/30" : ""
                    }`}
                  >
                    <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-foreground">#{userRank}</div>
                    <p className="text-xs text-muted-foreground">Your Rank</p>
                    {userRank <= 3 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6, type: "spring", stiffness: 400 }}
                      >
                        <Badge variant="secondary" className="mt-1 text-[10px] gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> Top 3
                        </Badge>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leaderboard...</div>
            ) : (
              <Tabs defaultValue="engagement" className="w-full">
                <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1 rounded-lg mb-6">
                  <TabsTrigger value="engagement">Most Engaged</TabsTrigger>
                  <TabsTrigger value="consistency">Consistency</TabsTrigger>
                  <TabsTrigger value="overall">Overall Scores</TabsTrigger>
                  <TabsTrigger value="badges">Badges</TabsTrigger>
                  <TabsTrigger value="history" className="gap-1">
                    <History className="h-3.5 w-3.5" /> History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="engagement">
                  <LeaderboardTable entries={topEngaged} user={user} showWeekly allEntries={[...entries].sort((a, b) => b.weekly_quizzes - a.weekly_quizzes)} />
                </TabsContent>

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
                          <motion.div
                            key={entry.user_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08, duration: 0.4 }}
                            className={`flex items-center gap-4 px-4 py-4 ${isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"}`}
                          >
                            <div className="flex items-center justify-center w-8">{getRankIcon(i + 1, i < 3)}</div>
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
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="overall">
                  <LeaderboardTable entries={overallEntries} user={user} showWeekly={false} allEntries={entries} />
                </TabsContent>

                <TabsContent value="badges">
                  {recentBadges.length === 0 ? (
                    <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
                      <Award className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No badges awarded yet. Keep studying!</p>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden divide-y divide-border">
                      {recentBadges.map((ub, i) => {
                        const IconComp = iconMap[ub.badges?.icon || "award"] || Award;
                        const isCurrentUser = user?.id === ub.user_id;
                        const entry = entries.find((e) => e.user_id === ub.user_id);
                        return (
                          <motion.div
                            key={ub.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08, duration: 0.4 }}
                            className={`flex items-center gap-4 px-4 py-4 ${isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                          >
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
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

// Reusable leaderboard table with animations
const LeaderboardTable = ({
  entries, user, showWeekly, allEntries,
}: { entries: LeaderboardEntry[]; user: any; showWeekly: boolean; allEntries?: LeaderboardEntry[] }) => {
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
          const isTop3 = actualRank <= 3;
          const glowClass = getRankGlow(actualRank, isCurrentUser);

          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                type: isTop3 ? "spring" : "tween",
                stiffness: isTop3 ? 200 : undefined,
              }}
            >
              {showSeparator && (
                <div className="flex items-center justify-center py-2 text-muted-foreground text-xs gap-2">
                  <span className="h-px flex-1 bg-border" />
                  <span>•••</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              <div
                className={`grid grid-cols-[48px_1fr_80px_80px_100px] sm:grid-cols-[48px_1fr_100px_80px_100px_80px] items-center px-4 py-3 transition-all duration-300 ${
                  isCurrentUser ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/20"
                } ${glowClass}`}
              >
                <div className="flex items-center justify-center">{getRankIcon(actualRank, isTop3)}</div>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className={`h-8 w-8 shrink-0 ${isTop3 && isCurrentUser ? "ring-2 ring-yellow-500/50" : ""}`}>
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(entry.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {entry.full_name}
                      {isCurrentUser && <span className="text-xs text-primary ml-1">(You)</span>}
                      {isTop3 && isCurrentUser && (
                        <Sparkles className="inline h-3 w-3 text-yellow-500 ml-1 animate-pulse" />
                      )}
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
