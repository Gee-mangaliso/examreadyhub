import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const weekStart = getWeekStart();

    // Check if snapshot already exists for this week
    const { data: existing } = await supabase
      .from("leaderboard_snapshots")
      .select("id")
      .eq("week_start", weekStart)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: "Snapshot already exists for this week", week_start: weekStart }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current leaderboard
    const { data: leaderboard } = await supabase.rpc("get_enhanced_leaderboard", { limit_count: 200 });

    if (!leaderboard || leaderboard.length === 0) {
      return new Response(
        JSON.stringify({ message: "No leaderboard data to snapshot" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert snapshots
    const snapshots = leaderboard.map((entry: any, idx: number) => ({
      user_id: entry.user_id,
      week_start: weekStart,
      rank: idx + 1,
      total_score: entry.total_score,
      total_questions: entry.total_questions,
      avg_percentage: entry.avg_percentage,
      weekly_quizzes: entry.weekly_quizzes,
      weekly_avg: entry.weekly_avg,
      current_streak: entry.current_streak,
    }));

    const { error } = await supabase.from("leaderboard_snapshots").insert(snapshots);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "Snapshot created", week_start: weekStart, count: snapshots.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().split("T")[0];
}
