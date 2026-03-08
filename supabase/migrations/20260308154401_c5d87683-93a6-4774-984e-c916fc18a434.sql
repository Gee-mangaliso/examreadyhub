
-- Create admin_suggestions table
CREATE TABLE public.admin_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  suggested_by UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'note',
  content_id UUID NOT NULL,
  content_title TEXT NOT NULL,
  subject_name TEXT,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions
CREATE POLICY "Users can view their own suggestions"
  ON public.admin_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own suggestions
CREATE POLICY "Users can update their own suggestions"
  ON public.admin_suggestions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can insert suggestions
CREATE POLICY "Admins can insert suggestions"
  ON public.admin_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete suggestions
CREATE POLICY "Admins can delete suggestions"
  ON public.admin_suggestions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
