-- Allow all authenticated users to view all tasks
DROP POLICY IF EXISTS "Employees can read assigned tasks" ON crm_tasks;
CREATE POLICY "Employees can read all tasks" ON crm_tasks FOR SELECT TO authenticated USING (true);
