import { useState, useEffect } from "react";
import { Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const RateExperience = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [lastRating, setLastRating] = useState<{ rating: number; comment: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    // Check if user rated in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    supabase
      .from("site_ratings")
      .select("rating, comment")
      .eq("user_id", user.id)
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAlreadyRated(true);
          setLastRating(data[0] as any);
        }
      });
  }, [user]);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("site_ratings").insert({
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    } as any);
    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Thank you! 🎉", description: "Your feedback helps us improve." });
      setAlreadyRated(true);
      setLastRating({ rating, comment: comment.trim() || null });
    }
    setSubmitting(false);
  };

  if (alreadyRated && lastRating) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 shadow-card">
        <h3 className="font-heading text-sm text-foreground mb-2">Your Recent Rating</h3>
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`h-4 w-4 ${s <= lastRating.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        {lastRating.comment && <p className="text-xs text-muted-foreground">{lastRating.comment}</p>}
        <p className="text-xs text-muted-foreground/60 mt-2">You can rate again next week!</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card space-y-3">
      <h3 className="font-heading text-sm text-foreground">Rate Your Experience</h3>
      <p className="text-xs text-muted-foreground">How's your learning experience so far?</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star className={`h-6 w-6 transition-colors ${s <= (hover || rating) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs text-muted-foreground ml-2">
            {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Great" : "Excellent"}
          </span>
        )}
      </div>
      <Textarea
        placeholder="Tell us more (optional)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="min-h-[60px] text-sm"
        rows={2}
      />
      <Button size="sm" onClick={handleSubmit} disabled={rating === 0 || submitting} className="gap-1.5">
        <Send className="h-3.5 w-3.5" />
        {submitting ? "Submitting..." : "Submit Rating"}
      </Button>
    </div>
  );
};

export default RateExperience;
