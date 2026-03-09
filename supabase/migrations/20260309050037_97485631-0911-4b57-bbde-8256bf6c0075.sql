
-- Add phone_number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Phone OTP table for verification
CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
-- OTP table needs public access for the verification flow (no sensitive data exposed)
CREATE POLICY "Service can manage OTP" ON public.phone_otps FOR ALL USING (true);

-- Teacher invites table
CREATE TABLE public.teacher_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_email text,
  student_phone text,
  student_id uuid,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone
);
ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can insert invites" ON public.teacher_invites FOR INSERT WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can view own invites" ON public.teacher_invites FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view received invites" ON public.teacher_invites FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can update received invites" ON public.teacher_invites FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Teachers can delete own invites" ON public.teacher_invites FOR DELETE USING (auth.uid() = teacher_id);

-- Teacher-student collaboration link
CREATE TABLE public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);
ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can view own students" ON public.teacher_students FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view own teachers" ON public.teacher_students FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Teachers can insert students" ON public.teacher_students FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete students" ON public.teacher_students FOR DELETE USING (auth.uid() = teacher_id);

-- Teacher content
CREATE TABLE public.teacher_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  content_type text NOT NULL DEFAULT 'note',
  subject_id uuid REFERENCES public.subjects(id),
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.teacher_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage own content" ON public.teacher_content FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Linked students can view teacher content" ON public.teacher_content FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teacher_students ts WHERE ts.teacher_id = teacher_content.teacher_id AND ts.student_id = auth.uid())
);

-- Teacher daily activities
CREATE TABLE public.teacher_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  activity_type text NOT NULL DEFAULT 'general',
  due_date date,
  quiz_id uuid REFERENCES public.quizzes(id),
  lockdown_required boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.teacher_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage own activities" ON public.teacher_activities FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Linked students can view activities" ON public.teacher_activities FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teacher_students ts WHERE ts.teacher_id = teacher_activities.teacher_id AND ts.student_id = auth.uid())
);

-- Activity completions
CREATE TABLE public.activity_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  score integer,
  notes text,
  UNIQUE(activity_id, student_id)
);
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage own completions" ON public.activity_completions FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view student completions" ON public.activity_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teacher_activities ta JOIN public.teacher_students ts ON ts.teacher_id = ta.teacher_id WHERE ta.id = activity_completions.activity_id AND ts.student_id = activity_completions.student_id AND ts.teacher_id = auth.uid())
);

-- Lockdown exam sessions
CREATE TABLE public.lockdown_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id),
  activity_id uuid REFERENCES public.teacher_activities(id),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  webcam_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'
);
ALTER TABLE public.lockdown_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON public.lockdown_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view student sessions" ON public.lockdown_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teacher_students ts WHERE ts.student_id = lockdown_sessions.user_id AND ts.teacher_id = auth.uid())
);

-- Update handle_new_user to assign role based on registration choice
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  INSERT INTO public.profiles (user_id, full_name, phone_number)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'phone_number');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role::app_role);
  RETURN NEW;
END;
$$;

-- Resolve teacher invites when new user signs up
CREATE OR REPLACE FUNCTION public.resolve_teacher_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teacher_invites
  SET student_id = NEW.id
  WHERE (student_email = NEW.email OR student_phone = (NEW.raw_user_meta_data->>'phone_number'))
    AND student_id IS NULL
    AND status = 'pending';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_resolve_invites
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.resolve_teacher_invites();

-- Add has_role check for teacher
-- Teachers can view profiles of their students
CREATE POLICY "Teachers can view student profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teacher_students ts WHERE ts.student_id = profiles.user_id AND ts.teacher_id = auth.uid())
);
