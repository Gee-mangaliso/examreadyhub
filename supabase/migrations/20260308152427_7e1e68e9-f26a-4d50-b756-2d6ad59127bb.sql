
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, _type text, _title text, _message text, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (_user_id, _type, _title, _message, _metadata);
END;
$$;

-- Trigger: notify on badge award
CREATE OR REPLACE FUNCTION public.notify_badge_award()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  badge_name text;
BEGIN
  SELECT name INTO badge_name FROM badges WHERE id = NEW.badge_id;
  PERFORM create_notification(
    NEW.user_id, 'badge',
    'Badge Earned! 🏆',
    'Congratulations! You earned the "' || COALESCE(badge_name, 'Unknown') || '" badge!',
    jsonb_build_object('badge_id', NEW.badge_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_badge_awarded
  AFTER INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION notify_badge_award();

-- Trigger: notify on new content added to a subject (notes)
CREATE OR REPLACE FUNCTION public.notify_new_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  sub_name text;
  r record;
BEGIN
  SELECT name INTO sub_name FROM subjects WHERE id = NEW.subject_id;
  FOR r IN SELECT user_id FROM user_subjects WHERE subject_id = NEW.subject_id LOOP
    PERFORM create_notification(
      r.user_id, 'content',
      'New Content Added 📚',
      'New content "' || NEW.title || '" was added to ' || COALESCE(sub_name, 'your subject') || '.',
      jsonb_build_object('subject_id', NEW.subject_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_note_added AFTER INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION notify_new_content();
CREATE TRIGGER on_slide_added AFTER INSERT ON public.slides FOR EACH ROW EXECUTE FUNCTION notify_new_content();
CREATE TRIGGER on_worked_example_added AFTER INSERT ON public.worked_examples FOR EACH ROW EXECUTE FUNCTION notify_new_content();
