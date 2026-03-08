CREATE POLICY "Admins can view all suggestions"
ON public.admin_suggestions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));