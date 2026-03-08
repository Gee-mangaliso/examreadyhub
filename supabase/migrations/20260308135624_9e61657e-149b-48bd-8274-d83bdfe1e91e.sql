
-- Function to get all students with their participation stats (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_all_students()
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  grade text,
  created_at timestamptz,
  total_quizzes_taken bigint,
  total_score bigint,
  total_questions bigint,
  avg_percentage numeric,
  last_quiz_at timestamptz,
  subjects_enrolled bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(p.full_name, 'Anonymous') as full_name,
    u.email,
    p.avatar_url,
    p.grade,
    p.created_at,
    COALESCE(qa.total_quizzes, 0) as total_quizzes_taken,
    COALESCE(qa.total_score, 0) as total_score,
    COALESCE(qa.total_questions, 0) as total_questions,
    COALESCE(qa.avg_pct, 0) as avg_percentage,
    qa.last_quiz_at,
    COALESCE(us.subject_count, 0) as subjects_enrolled
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN (
    SELECT
      user_id,
      COUNT(*) as total_quizzes,
      SUM(score) as total_score,
      SUM(total_questions) as total_questions,
      ROUND(AVG(score::numeric / NULLIF(total_questions, 0) * 100), 1) as avg_pct,
      MAX(completed_at) as last_quiz_at
    FROM quiz_attempts
    GROUP BY user_id
  ) qa ON qa.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as subject_count
    FROM user_subjects
    GROUP BY user_id
  ) us ON us.user_id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC;
$$;

-- Function to get detailed quiz attempts for a specific student (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_student_attempts(_student_id uuid)
RETURNS TABLE(
  attempt_id uuid,
  quiz_title text,
  subject_name text,
  grade_name text,
  score integer,
  total_questions integer,
  percentage numeric,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qa.id as attempt_id,
    q.title as quiz_title,
    s.name as subject_name,
    g.name as grade_name,
    qa.score,
    qa.total_questions,
    ROUND(qa.score::numeric / NULLIF(qa.total_questions, 0) * 100, 1) as percentage,
    qa.completed_at
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id
  JOIN subjects s ON s.id = q.subject_id
  JOIN grades g ON g.id = s.grade_id
  WHERE qa.user_id = _student_id
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY qa.completed_at DESC;
$$;

-- Function to get platform overview stats (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_platform_stats()
RETURNS TABLE(
  total_students bigint,
  total_quiz_attempts bigint,
  avg_score numeric,
  active_today bigint,
  active_this_week bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM profiles) as total_students,
    (SELECT COUNT(*) FROM quiz_attempts) as total_quiz_attempts,
    (SELECT ROUND(AVG(score::numeric / NULLIF(total_questions, 0) * 100), 1) FROM quiz_attempts) as avg_score,
    (SELECT COUNT(DISTINCT user_id) FROM quiz_attempts WHERE completed_at >= CURRENT_DATE) as active_today,
    (SELECT COUNT(DISTINCT user_id) FROM quiz_attempts WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days') as active_this_week
  WHERE public.has_role(auth.uid(), 'admin');
$$;
