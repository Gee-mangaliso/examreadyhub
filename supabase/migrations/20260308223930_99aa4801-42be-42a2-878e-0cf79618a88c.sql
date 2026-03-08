
-- Allow admins to read all profiles (needed for restrictions overview, student management)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
