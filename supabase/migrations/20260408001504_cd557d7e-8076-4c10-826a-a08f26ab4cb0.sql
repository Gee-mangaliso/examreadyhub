
CREATE POLICY "Teachers can view student quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teacher_students ts
    WHERE ts.student_id = quiz_attempts.user_id
      AND ts.teacher_id = auth.uid()
  )
);
