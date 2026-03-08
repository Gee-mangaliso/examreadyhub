
-- Weekly leaderboard snapshots
CREATE TABLE public.leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  rank integer NOT NULL,
  total_score bigint NOT NULL DEFAULT 0,
  total_questions bigint NOT NULL DEFAULT 0,
  avg_percentage numeric NOT NULL DEFAULT 0,
  weekly_quizzes bigint NOT NULL DEFAULT 0,
  weekly_avg numeric DEFAULT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard snapshots"
  ON public.leaderboard_snapshots FOR SELECT
  USING (true);

-- Content views tracking (for recently added removal)
CREATE TABLE public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'note',
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id, content_type)
);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own content views"
  ON public.content_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content views"
  ON public.content_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);
