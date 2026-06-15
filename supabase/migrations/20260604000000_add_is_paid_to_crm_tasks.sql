-- Track payment status per task so the Historial de Ventas page can mark a
-- completed service as paid / pending. Defaults to false so existing rows
-- read as Pendiente.
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;
