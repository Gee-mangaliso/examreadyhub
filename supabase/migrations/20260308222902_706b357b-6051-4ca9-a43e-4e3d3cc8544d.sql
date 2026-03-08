
-- Create site_ratings table for student experience ratings
CREATE TABLE public.site_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own ratings" ON public.site_ratings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ratings" ON public.site_ratings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings" ON public.site_ratings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
