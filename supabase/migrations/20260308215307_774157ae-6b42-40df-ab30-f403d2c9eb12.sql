
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  grade text,
  quote text NOT NULL,
  stars integer NOT NULL DEFAULT 5,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved testimonials
CREATE POLICY "Anyone can view approved testimonials" ON public.testimonials
  FOR SELECT USING (approved = true);

-- Admins can view all testimonials
CREATE POLICY "Admins can view all testimonials" ON public.testimonials
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Admins can update testimonials (approve/reject)
CREATE POLICY "Admins can update testimonials" ON public.testimonials
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Admins can delete testimonials
CREATE POLICY "Admins can delete testimonials" ON public.testimonials
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can insert their own testimonials
CREATE POLICY "Users can insert own testimonials" ON public.testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id);
