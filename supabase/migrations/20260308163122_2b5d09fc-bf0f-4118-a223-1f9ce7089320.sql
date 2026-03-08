
-- Exam papers table (province-based past papers)
CREATE TABLE public.exam_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  province text NOT NULL,
  term text NOT NULL,
  year integer NOT NULL,
  title text NOT NULL,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_papers_subject ON public.exam_papers(subject_id);
CREATE INDEX idx_exam_papers_province ON public.exam_papers(province);
CREATE INDEX idx_exam_papers_year ON public.exam_papers(year);
CREATE UNIQUE INDEX idx_exam_papers_unique ON public.exam_papers(subject_id, province, term, year);

ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exam papers" ON public.exam_papers FOR SELECT USING (true);
CREATE POLICY "Admins can insert exam papers" ON public.exam_papers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update exam papers" ON public.exam_papers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete exam papers" ON public.exam_papers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Exam completions (learner marks exam as done with score)
CREATE TABLE public.exam_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_paper_id uuid NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total_marks integer NOT NULL DEFAULT 100,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exam_paper_id)
);

ALTER TABLE public.exam_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions" ON public.exam_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own completions" ON public.exam_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own completions" ON public.exam_completions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all completions" ON public.exam_completions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Memo requests
CREATE TABLE public.memo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_paper_id uuid NOT NULL REFERENCES public.exam_papers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  memo_url text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (user_id, exam_paper_id)
);

ALTER TABLE public.memo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memo requests" ON public.memo_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own memo requests" ON public.memo_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all memo requests" ON public.memo_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update memo requests" ON public.memo_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
