
-- Function to get study streak for a user
CREATE OR REPLACE FUNCTION public.get_study_streak(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  streak integer := 0;
  check_date date := CURRENT_DATE;
  has_activity boolean;
BEGIN
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM quiz_attempts
      WHERE user_id = _user_id
        AND completed_at::date = check_date
    ) INTO has_activity;
    
    IF NOT has_activity AND check_date = CURRENT_DATE THEN
      -- Check yesterday if no activity today yet
      check_date := check_date - 1;
      SELECT EXISTS (
        SELECT 1 FROM quiz_attempts
        WHERE user_id = _user_id
          AND completed_at::date = check_date
      ) INTO has_activity;
      IF NOT has_activity THEN
        EXIT;
      END IF;
    ELSIF NOT has_activity THEN
      EXIT;
    END IF;
    
    streak := streak + 1;
    check_date := check_date - 1;
  END LOOP;
  
  RETURN streak;
END;
$$;

-- RLS policies for admin to manage quizzes
CREATE POLICY "Admins can insert quizzes"
ON public.quizzes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quizzes"
ON public.quizzes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quizzes"
ON public.quizzes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for admin to manage quiz questions
CREATE POLICY "Admins can insert quiz questions"
ON public.quiz_questions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quiz questions"
ON public.quiz_questions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quiz questions"
ON public.quiz_questions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
