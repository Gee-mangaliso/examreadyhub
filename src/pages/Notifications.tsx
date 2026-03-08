import { useState, useEffect } from "react";
import { Bell, Trophy, BookOpen, Flame, Info, Sparkles, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

const typeIcons: Record<string, typeof Bell> = {
  badge: Trophy,
  content: BookOpen,
  streak_warning: Flame,
  suggestion: Sparkles,
  info: Info,
};

const typeLabels: Record<string, string> = {
  badge: "Badge",
  content: "New Content",
  streak_warning: "Streak",
  suggestion: "Suggestion",
  info: "Info",
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications((data as Notification[]) || []);
        setLoading(false);
      });

    // Realtime
    const channel = supabase
      .channel("notifications-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleExpand = (n: Notification) => {
    if (!n.read) markRead(n.id);
    setExpandedId(expandedId === n.id ? null : n.id);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-heading text-foreground flex items-center gap-3">
                  <Bell className="h-7 w-7 text-primary" /> Notifications
                </h1>
                <p className="text-muted-foreground mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
                  <CheckCheck className="h-4 w-4" /> Mark all read
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 shadow-card text-center">
                <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => {
                  const Icon = typeIcons[n.type] || Info;
                  const isExpanded = expandedId === n.id;
                  return (
                    <div
                      key={n.id}
                      className={`border rounded-lg overflow-hidden transition-colors ${
                        !n.read ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <button
                        onClick={() => toggleExpand(n)}
                        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${!n.read ? "bg-primary/15" : "bg-muted"}`}>
                          <Icon className={`h-4 w-4 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm ${!n.read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                              {n.title}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {typeLabels[n.type] || n.type}
                            </span>
                          </div>
                          <p className={`text-sm text-muted-foreground mt-1 ${isExpanded ? "" : "line-clamp-1"}`}>
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatTimeAgo(n.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.read && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-0 ml-14">
                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{n.message}</p>
                            {n.metadata && Object.keys(n.metadata).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-xs text-muted-foreground mb-1">Details</p>
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(n.metadata).map(([key, val]) => (
                                    <span key={key} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                      {key}: {String(val)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {!n.read && (
                            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>
                              <Check className="h-3 w-3 mr-1" /> Mark as read
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Notifications;
