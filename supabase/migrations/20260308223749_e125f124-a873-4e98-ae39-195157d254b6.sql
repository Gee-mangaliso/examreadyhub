
-- Add admin_reply and admin_replied_at columns to site_ratings
ALTER TABLE public.site_ratings ADD COLUMN admin_reply TEXT;
ALTER TABLE public.site_ratings ADD COLUMN admin_replied_at TIMESTAMP WITH TIME ZONE;

-- Allow admins to update ratings (for replies)
CREATE POLICY "Admins can update ratings" ON public.site_ratings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
