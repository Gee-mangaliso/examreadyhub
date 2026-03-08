import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Get all badges with auto criteria
    const { data: badges } = await supabase
      .from("badges")
      .select("*")
      .neq("badge_type", "manual");

    if (!badges || badges.length === 0) {
      return new Response(
        JSON.stringify({ message: "No auto badges configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users with quiz activity
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, full_name");

    if (!users) {
      return new Response(
        JSON.stringify({ message: "No users found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const awarded: string[] = [];

    for (const user of users) {
      // Get user stats
      const { data: streak } = await supabase.rpc("get_study_streak", {
        _user_id: user.user_id,
      });

      const { data: weeklyAttempts } = await supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, completed_at")
        .eq("user_id", user.user_id)
        .gte("completed_at", weekStart);

      const weeklyQuizCount = weeklyAttempts?.length || 0;
      const weeklyAvg =
        weeklyAttempts && weeklyAttempts.length > 0
          ? weeklyAttempts.reduce(
              (sum, a) =>
                sum + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0),
              0
            ) / weeklyAttempts.length
          : 0;

      // Get previous week avg
      const prevWeekStart = getPrevWeekStart();
      const { data: prevAttempts } = await supabase
        .from("quiz_attempts")
        .select("score, total_questions")
        .eq("user_id", user.user_id)
        .gte("completed_at", prevWeekStart)
        .lt("completed_at", weekStart);

      const prevAvg =
        prevAttempts && prevAttempts.length > 0
          ? prevAttempts.reduce(
              (sum, a) =>
                sum + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0),
              0
            ) / prevAttempts.length
          : 0;

      const improvement = weeklyAvg - prevAvg;

      for (const badge of badges) {
        let qualifies = false;
        const criteria = badge.criteria_value || 0;

        switch (badge.badge_type) {
          case "streak":
            qualifies = (streak || 0) >= criteria;
            break;
          case "quiz_count":
            qualifies = weeklyQuizCount >= criteria;
            break;
          case "improvement":
            qualifies =
              improvement >= criteria && prevAttempts !== null && prevAttempts.length > 0;
            break;
          case "score":
            qualifies = weeklyAvg >= criteria && weeklyQuizCount > 0;
            break;
        }

        if (qualifies) {
          // Check if already awarded this week
          const { data: existing } = await supabase
            .from("user_badges")
            .select("id")
            .eq("user_id", user.user_id)
            .eq("badge_id", badge.id)
            .eq("week_start", weekStart)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from("user_badges").insert({
              user_id: user.user_id,
              badge_id: badge.id,
              week_start: weekStart,
            });
            if (!error) {
              awarded.push(`${user.full_name}: ${badge.name}`);
            }
          }
        }
      }

      // Streak encouragement notifications
      if (streak === 1) {
        await supabase.rpc("create_notification", {
          _user_id: user.user_id,
          _type: "streak_warning",
          _title: "Streak Alert! 🔥",
          _message: "Your study streak is about to break! Complete a quiz today to keep it going.",
          _metadata: JSON.stringify({}),
        });
      } else if (streak === 3) {
        await supabase.rpc("create_notification", {
          _user_id: user.user_id,
          _type: "streak_milestone",
          _title: "3-Day Streak! 🎯",
          _message: "You've been studying for 3 days straight — amazing consistency! Keep pushing!",
          _metadata: JSON.stringify({ streak: 3 }),
        });
      } else if (streak === 7) {
        await supabase.rpc("create_notification", {
          _user_id: user.user_id,
          _type: "streak_milestone",
          _title: "One Week Streak! 🏆",
          _message: "7 days of studying! You're building a powerful habit. Your future self will thank you!",
          _metadata: JSON.stringify({ streak: 7 }),
        });
      } else if (streak === 14) {
        await supabase.rpc("create_notification", {
          _user_id: user.user_id,
          _type: "streak_milestone",
          _title: "Two Week Legend! 🌟",
          _message: "14 days without missing a beat! You're in the top tier of dedicated learners.",
          _metadata: JSON.stringify({ streak: 14 }),
        });
      } else if (streak === 30) {
        await supabase.rpc("create_notification", {
          _user_id: user.user_id,
          _type: "streak_milestone",
          _title: "30-Day Champion! 👑",
          _message: "A full month of daily studying! You're absolutely unstoppable. Incredible dedication!",
          _metadata: JSON.stringify({ streak: 30 }),
        });
      }

      // Encourage inactive students (0 streak, had activity before)
      if ((streak || 0) === 0 && weeklyQuizCount === 0 && prevAttempts && prevAttempts.length > 0) {
        await supabase.rpc("create_notification", {
          _user_id: user.user_id,
          _type: "encouragement",
          _title: "We Miss You! 📚",
          _message: "It's been a while since your last study session. Jump back in with a quick quiz today!",
          _metadata: JSON.stringify({}),
        });
      }
    }

    return new Response(
      JSON.stringify({ message: "Badge awarding complete", awarded }),
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

function getPrevWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1) - 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().split("T")[0];
}
