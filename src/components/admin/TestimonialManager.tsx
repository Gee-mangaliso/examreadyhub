import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Star, Check, X, Trash2, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  full_name: string;
  grade: string | null;
  quote: string;
  stars: number;
  approved: boolean;
  created_at: string;
}

const TestimonialManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data || []) as Testimonial[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleApproval = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("testimonials")
      .update({ approved: !current })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: current ? "Testimonial hidden" : "Testimonial approved ✓" });
      fetchAll();
    }
  };

  const deleteTestimonial = async (id: string) => {
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Testimonial deleted" });
      fetchAll();
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading testimonials…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading text-foreground flex items-center gap-2">
          <Quote className="h-5 w-5 text-primary" />
          Student Testimonials ({items.length})
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No testimonials submitted yet. Learners can submit testimonials from the home page.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Testimonial</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium text-foreground text-sm">{t.full_name}</div>
                    {t.grade && <div className="text-xs text-muted-foreground">{t.grade}</div>}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-foreground italic truncate">"{t.quote}"</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-0.5">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.approved ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant={t.approved ? "outline" : "default"}
                        onClick={() => toggleApproval(t.id, t.approved)}
                        className="gap-1"
                      >
                        {t.approved ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        {t.approved ? "Hide" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteTestimonial(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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

export default TestimonialManager;
