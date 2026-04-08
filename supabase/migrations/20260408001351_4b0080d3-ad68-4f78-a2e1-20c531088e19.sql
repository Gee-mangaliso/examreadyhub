
-- Trigger function to notify students when teacher creates activity
CREATE OR REPLACE FUNCTION public.notify_students_new_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  teacher_name text;
BEGIN
  SELECT full_name INTO teacher_name FROM profiles WHERE user_id = NEW.teacher_id;
  
  FOR r IN SELECT student_id FROM teacher_students WHERE teacher_id = NEW.teacher_id LOOP
    PERFORM create_notification(
      r.student_id,
      'activity',
      'New Assignment 📋',
      COALESCE(teacher_name, 'Your teacher') || ' assigned: "' || NEW.title || '"' ||
        CASE WHEN NEW.lockdown_required THEN ' (Lockdown Exam)' ELSE '' END,
      jsonb_build_object('activity_id', NEW.id, 'lockdown', NEW.lockdown_required)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_teacher_activity_created
AFTER INSERT ON public.teacher_activities
FOR EACH ROW
EXECUTE FUNCTION public.notify_students_new_activity();
