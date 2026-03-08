CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT NULL,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (even anonymous)
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admins can view all feedback
CREATE POLICY "Admins can view feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);