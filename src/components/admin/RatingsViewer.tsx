import { useState, useEffect } from "react";
import { Star, BarChart3, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface Rating {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const RatingsViewer = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_ratings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRatings((data || []) as Rating[]);
        setLoading(false);
      });
  }, []);

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

      {/* Table */}
      {ratings.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No ratings submitted yet.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratings.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{r.comment || <span className="text-muted-foreground italic">No comment</span>}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default RatingsViewer;
