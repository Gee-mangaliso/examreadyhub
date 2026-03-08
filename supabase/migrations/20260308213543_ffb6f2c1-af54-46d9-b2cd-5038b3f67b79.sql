ALTER TABLE public.admin_suggestions ADD COLUMN reply text DEFAULT NULL;
ALTER TABLE public.admin_suggestions ADD COLUMN replied_at timestamptz DEFAULT NULL;