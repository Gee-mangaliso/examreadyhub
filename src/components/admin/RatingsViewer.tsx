import { useState, useEffect } from "react";
import { Star, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Rating {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
}

const RatingsViewer = () => {
  const { toast } = useToast();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const fetchRatings = () => {
    supabase
      .from("site_ratings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRatings((data || []) as Rating[]);
        setLoading(false);
      });
  };

  useEffect(() => { fetchRatings(); }, []);

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    const { error } = await supabase
      .from("site_ratings")
      .update({ admin_reply: replyText.trim(), admin_replied_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reply sent!" });
      // Notify the student
      const rating = ratings.find((r) => r.id === id);
      if (rating) {
        await supabase.rpc("create_notification", {
          _user_id: rating.user_id,
          _type: "rating_reply",
          _title: "Admin replied to your rating ⭐",
          _message: replyText.trim(),
          _metadata: JSON.stringify({}),
        });
      }
      setReplyingId(null);
      setReplyText("");
      fetchRatings();
    }
    setReplySubmitting(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading ratings…</div>;
  }

  const avg = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
    : "0";

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = ratings.filter((r) => r.rating === star).length;
    const pct = ratings.length > 0 ? Math.round((count / ratings.length) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-heading text-foreground flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-500" />
        Student Experience Ratings ({ratings.length})
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 shadow-card flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-yellow-500">{avg}</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avg)) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Average from {ratings.length} rating{ratings.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 shadow-card space-y-2">
          {distribution.map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-sm">
              <span className="w-12 text-muted-foreground">{d.star} star</span>
              <Progress value={d.pct} className="h-2 flex-1" />
              <span className="w-8 text-right text-muted-foreground text-xs">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ratings list */}
      {ratings.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No ratings submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-4 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy HH:mm")}</span>
              </div>

              {r.comment && (
                <p className="text-sm text-foreground">{r.comment}</p>
              )}
              {!r.comment && (
                <p className="text-sm text-muted-foreground italic">No comment provided</p>
              )}

              {/* Admin reply */}
              {r.admin_reply ? (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                    <MessageSquare className="h-3 w-3" /> Admin Reply
                  </div>
                  <p className="text-sm text-foreground">{r.admin_reply}</p>
                  {r.admin_replied_at && (
                    <p className="text-[10px] text-muted-foreground">{format(new Date(r.admin_replied_at), "MMM d, yyyy HH:mm")}</p>
                  )}
                </div>
              ) : replyingId === r.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleReply(r.id)} disabled={replySubmitting || !replyText.trim()} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      {replySubmitting ? "Sending..." : "Send Reply"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setReplyingId(null); setReplyText(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={() => { setReplyingId(r.id); setReplyText(""); }}>
                  <MessageSquare className="h-3 w-3" /> Reply
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RatingsViewer;
