
CREATE TABLE public.user_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id)
);

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subjects"
  ON public.user_subjects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects"
  ON public.user_subjects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
  ON public.user_subjects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
