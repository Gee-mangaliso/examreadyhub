
-- Create user_restrictions table for bans and content restrictions
CREATE TABLE public.user_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  restriction_type TEXT NOT NULL DEFAULT 'ban',
  reason TEXT,
  restricted_content_type TEXT,
  restricted_subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

-- Admins can fully manage restrictions
CREATE POLICY "Admins can manage restrictions" ON public.user_restrictions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own restrictions
CREATE POLICY "Users can view own restrictions" ON public.user_restrictions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
