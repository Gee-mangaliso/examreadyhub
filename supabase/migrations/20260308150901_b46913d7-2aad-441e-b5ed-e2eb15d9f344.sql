
-- Add type to quizzes for quiz vs exam distinction
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'quiz';

-- Slides table
CREATE TABLE public.slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  file_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Worked examples table
CREATE TABLE public.worked_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  file_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Badges table
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award',
  badge_type text NOT NULL DEFAULT 'manual',
  criteria_value integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User badges table
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  week_start date,
  awarded_by uuid
);

-- Storage bucket for content files
INSERT INTO storage.buckets (id, name, public) VALUES ('content-files', 'content-files', true);

-- Enable RLS on new tables
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worked_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Slides RLS
CREATE POLICY "Anyone can view slides" ON public.slides FOR SELECT USING (true);
CREATE POLICY "Admins can insert slides" ON public.slides FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update slides" ON public.slides FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete slides" ON public.slides FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Worked examples RLS
CREATE POLICY "Anyone can view worked examples" ON public.worked_examples FOR SELECT USING (true);
CREATE POLICY "Admins can insert worked examples" ON public.worked_examples FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update worked examples" ON public.worked_examples FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete worked examples" ON public.worked_examples FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Badges RLS
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User badges RLS
CREATE POLICY "Anyone can view user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Admins can insert user badges" ON public.user_badges FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin RLS for notes (CRUD)
CREATE POLICY "Admins can insert notes" ON public.notes FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update notes" ON public.notes FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete notes" ON public.notes FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Admin RLS for subjects (insert/delete)
CREATE POLICY "Admins can insert subjects" ON public.subjects FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update subjects" ON public.subjects FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete subjects" ON public.subjects FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Storage RLS for content-files bucket
CREATE POLICY "Anyone can view content files" ON storage.objects FOR SELECT USING (bucket_id = 'content-files');
CREATE POLICY "Admins can upload content files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'content-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete content files" ON storage.objects FOR DELETE USING (bucket_id = 'content-files' AND public.has_role(auth.uid(), 'admin'));

-- Function for enhanced leaderboard with engagement tracking
CREATE OR REPLACE FUNCTION public.get_enhanced_leaderboard(limit_count integer DEFAULT 50)
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
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
  LEFT JOIN profiles p ON p.user_id = qa.user_id
  GROUP BY qa.user_id, p.full_name, p.avatar_url
  ORDER BY weekly_quizzes DESC, total_score DESC, avg_percentage DESC
  LIMIT limit_count;
$$;

-- Seed default badges
INSERT INTO public.badges (name, description, icon, badge_type, criteria_value) VALUES
  ('Weekly Warrior', 'Completed 5+ quizzes in a week', 'zap', 'weekly_quizzes', 5),
  ('Consistency King', '7-day study streak', 'flame', 'streak', 7),
  ('Top Scorer', 'Achieved 90%+ average in a week', 'trophy', 'weekly_avg', 90),
  ('Rising Star', 'Improved average by 10%+ from last week', 'trending-up', 'improvement', 10),
  ('Quiz Master', 'Completed 20+ quizzes total', 'award', 'total_quizzes', 20);

-- Enable realtime for user_badges
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
