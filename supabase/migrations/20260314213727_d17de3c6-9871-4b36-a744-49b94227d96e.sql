
-- Allow teachers to insert quizzes
CREATE POLICY "Teachers can insert quizzes"
ON public.quizzes FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

-- Allow teachers to update their own quizzes (we need a way to track ownership - use teacher_activities link)
CREATE POLICY "Teachers can update quizzes"
ON public.quizzes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Allow teachers to delete quizzes
CREATE POLICY "Teachers can delete quizzes"
ON public.quizzes FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Allow teachers to insert quiz questions
CREATE POLICY "Teachers can insert quiz questions"
ON public.quiz_questions FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

-- Allow teachers to update quiz questions
CREATE POLICY "Teachers can update quiz questions"
ON public.quiz_questions FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

-- Allow teachers to delete quiz questions
CREATE POLICY "Teachers can delete quiz questions"
ON public.quiz_questions FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));
