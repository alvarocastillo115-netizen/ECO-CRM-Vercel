-- Allow all authenticated users (including employees) to:
--   (a) read every task_services row (so Historial de Ventas shows the services
--       of all completed tasks for all roles)
--   (b) create / update crm_tasks and task_services (so the "Nueva Tarea"
--       button works for employees as well)
--
-- Reads on crm_tasks are already open to all authenticated users via the
-- 20260429 migration. Admin policies remain in place and continue to grant
-- full access.

-- task_services: read for everyone authenticated
DROP POLICY IF EXISTS "Employees can read task_services for assigned tasks" ON public.task_services;
DROP POLICY IF EXISTS "Authenticated can read task_services" ON public.task_services;
CREATE POLICY "Authenticated can read task_services"
  ON public.task_services
  FOR SELECT
  TO authenticated
  USING (true);

-- task_services: employees can insert / update / delete
DROP POLICY IF EXISTS "Employees can insert task_services" ON public.task_services;
CREATE POLICY "Employees can insert task_services"
  ON public.task_services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Employees can update task_services" ON public.task_services;
CREATE POLICY "Employees can update task_services"
  ON public.task_services
  FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Employees can delete task_services" ON public.task_services;
CREATE POLICY "Employees can delete task_services"
  ON public.task_services
  FOR DELETE
  TO authenticated
  USING (true);

-- crm_tasks: employees can insert and update any task (so they can create
-- tasks from "Nueva Tarea" and edit them later)
DROP POLICY IF EXISTS "Employees can insert crm_tasks" ON public.crm_tasks;
CREATE POLICY "Employees can insert crm_tasks"
  ON public.crm_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Employees can update assigned tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Employees can update crm_tasks" ON public.crm_tasks;
CREATE POLICY "Employees can update crm_tasks"
  ON public.crm_tasks
  FOR UPDATE
  TO authenticated
  USING (true);
