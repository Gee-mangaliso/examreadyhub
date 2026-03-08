
-- Fix: Replace permissive INSERT policy with SECURITY DEFINER function usage only
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only allow inserts via the create_notification SECURITY DEFINER function
-- No direct INSERT policy needed since triggers use SECURITY DEFINER functions
