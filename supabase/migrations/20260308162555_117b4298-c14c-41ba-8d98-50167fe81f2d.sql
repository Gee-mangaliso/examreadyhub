
-- Textbooks table
CREATE TABLE public.textbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.textbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view textbooks" ON public.textbooks FOR SELECT USING (true);
CREATE POLICY "Admins can insert textbooks" ON public.textbooks FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update textbooks" ON public.textbooks FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete textbooks" ON public.textbooks FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Study guides table
CREATE TABLE public.study_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  file_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view study guides" ON public.study_guides FOR SELECT USING (true);
CREATE POLICY "Admins can insert study guides" ON public.study_guides FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update study guides" ON public.study_guides FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete study guides" ON public.study_guides FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Notify triggers for new content
CREATE TRIGGER notify_new_textbook AFTER INSERT ON public.textbooks FOR EACH ROW EXECUTE FUNCTION public.notify_new_content();
CREATE TRIGGER notify_new_study_guide AFTER INSERT ON public.study_guides FOR EACH ROW EXECUTE FUNCTION public.notify_new_content();
