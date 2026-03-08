
CREATE OR REPLACE FUNCTION public.get_subject_leaderboard(
  _subject_id uuid,
  limit_count integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  total_score bigint,
  total_questions bigint,
  quizzes_taken bigint,
  avg_percentage numeric,
  current_streak integer,
  weekly_quizzes bigint,
  weekly_avg numeric,
  prev_weekly_avg numeric,
  trend text,
  badge_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    qa.user_id,
    COALESCE(p.full_name, 'Anonymous') as full_name,
    p.avatar_url,
    SUM(qa.score) as total_score,
    SUM(qa.total_questions) as total_questions,
    COUNT(qa.id) as quizzes_taken,
    ROUND(AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100), 1) as avg_percentage,
    COALESCE(public.get_study_streak(qa.user_id), 0) as current_streak,
    COUNT(qa.id) FILTER (WHERE qa.completed_at >= date_trunc('week', CURRENT_DATE)) as weekly_quizzes,
    ROUND(AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100) FILTER (WHERE qa.completed_at >= date_trunc('week', CURRENT_DATE)), 1) as weekly_avg,
    ROUND(AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100) FILTER (WHERE qa.completed_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days' AND qa.completed_at < date_trunc('week', CURRENT_DATE)), 1) as prev_weekly_avg,
    CASE
      WHEN AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100) FILTER (WHERE qa.completed_at >= date_trunc('week', CURRENT_DATE)) >
           AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100) FILTER (WHERE qa.completed_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days' AND qa.completed_at < date_trunc('week', CURRENT_DATE))
      THEN 'improving'
      WHEN AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100) FILTER (WHERE qa.completed_at >= date_trunc('week', CURRENT_DATE)) <
           AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100) FILTER (WHERE qa.completed_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 days' AND qa.completed_at < date_trunc('week', CURRENT_DATE))
      THEN 'declining'
      ELSE 'stable'
    END as trend,
    COALESCE((SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = qa.user_id), 0) as badge_count
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id AND q.subject_id = _subject_id
  LEFT JOIN profiles p ON p.user_id = qa.user_id
  GROUP BY qa.user_id, p.full_name, p.avatar_url
  ORDER BY weekly_quizzes DESC, total_score DESC, avg_percentage DESC
  LIMIT limit_count;
$$;
