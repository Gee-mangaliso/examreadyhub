
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  total_score bigint,
  total_questions bigint,
  quizzes_taken bigint,
  avg_percentage numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qa.user_id,
    COALESCE(p.full_name, 'Anonymous') as full_name,
    p.avatar_url,
    SUM(qa.score) as total_score,
    SUM(qa.total_questions) as total_questions,
    COUNT(qa.id) as quizzes_taken,
    ROUND(AVG(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100), 1) as avg_percentage
  FROM quiz_attempts qa
  LEFT JOIN profiles p ON p.user_id = qa.user_id
  GROUP BY qa.user_id, p.full_name, p.avatar_url
  ORDER BY total_score DESC, avg_percentage DESC
  LIMIT limit_count;
$$;
