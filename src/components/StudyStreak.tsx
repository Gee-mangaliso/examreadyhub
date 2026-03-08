import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const StudyStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_study_streak", { _user_id: user.id }).then(({ data }) => {
      setStreak(data ?? 0);
      setLoading(false);
    });
  }, [user]);

  if (loading) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${streak > 0 ? "bg-orange-500/10" : "bg-muted"}`}>
        <Flame className={`h-6 w-6 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{streak} day{streak !== 1 ? "s" : ""}</div>
        <p className="text-sm text-muted-foreground">
          {streak > 0 ? "Study streak — keep it going!" : "Take a quiz today to start your streak!"}
        </p>
      </div>
    </div>
  );
};

export default StudyStreak;
