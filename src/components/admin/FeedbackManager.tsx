import { useState, useEffect } from "react";
import { format } from "date-fns";
import { MessageSquare, Mail, User, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  user_id: string | null;
  created_at: string;
}

const FeedbackManager = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data || []) as Feedback[]);
    setLoading(false);
  };

  useEffect(() => { fetchFeedback(); }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading feedback…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Student Feedback ({items.length})
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No feedback messages yet.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-foreground font-medium text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {fb.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {fb.email}
                      </div>
                      {fb.user_id && <Badge variant="secondary" className="text-[10px]">Registered</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{fb.message}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(fb.created_at), "MMM d, yyyy HH:mm")}
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

export default FeedbackManager;
