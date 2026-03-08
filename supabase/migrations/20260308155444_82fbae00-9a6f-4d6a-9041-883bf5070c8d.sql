
-- Allow admins to view all search history for analytics
CREATE POLICY "Admins can view all search history"
  ON public.search_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
