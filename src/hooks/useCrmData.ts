import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CrmTask, Client, Category, TaskService, Profile, TaskStatus } from "@/types/crm";

export function useCrmData() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tasksRes, clientsRes, catsRes, servicesRes, profilesRes] = await Promise.all([
      supabase.from("crm_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("task_services").select("*, categories(*)"),
      supabase.from("profiles").select("*"),
    ]);

    const clientsData = (clientsRes.data || []) as Client[];
    const catsData = (catsRes.data || []) as Category[];
    const servicesData = (servicesRes.data || []) as any[];

    const enrichedTasks = ((tasksRes.data || []) as CrmTask[]).map((task) => ({
      ...task,
      client: clientsData.find((c) => c.id === task.client_id),
      services: servicesData
        .filter((s) => s.task_id === task.id)
        .map((s) => ({
          id: s.id,
          task_id: s.task_id,
          category_id: s.category_id,
          amount_allocated: Number(s.amount_allocated),
          category: s.categories as Category | undefined,
        })),
    }));

    setTasks(enrichedTasks);
    setClients(clientsData);
    setCategories(catsData);
    setEmployees((profilesRes.data || []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createTask = useCallback(
    async (data: {
      client_id: string;
      description: string;
      scheduled_date: string | null;
      specifications: string;
      assigned_to_user_id: string | null;
      services: { category_id: string; amount_allocated: number }[];
    }) => {
      const total = data.services.reduce((sum, s) => sum + s.amount_allocated, 0);
      const { data: newTask, error } = await supabase
        .from("crm_tasks")
        .insert({
          client_id: data.client_id,
          description: data.description,
          scheduled_date: data.scheduled_date,
          specifications: data.specifications,
          assigned_to_user_id: data.assigned_to_user_id,
          total_amount: total,
          status: "To-Do",
        })
        .select()
        .single();

      if (error || !newTask) return { error: error?.message || "Failed" };

      if (data.services.length > 0) {
        await supabase.from("task_services").insert(
          data.services.map((s) => ({
            task_id: newTask.id,
            category_id: s.category_id,
            amount_allocated: s.amount_allocated,
          }))
        );
      }

      await fetchAll();
      return { error: null };
    },
    [fetchAll]
  );

  const updateTaskStatus = useCallback(
    async (
      taskId: string,
      status: TaskStatus,
      keepAnEyeData?: { keep_an_eye_date: string; keep_an_eye_period_months: number }
    ) => {
      const updateData: any = { status };
      if (status === "Keep an Eye" && keepAnEyeData) {
        updateData.keep_an_eye_date = keepAnEyeData.keep_an_eye_date;
        updateData.keep_an_eye_period_months = keepAnEyeData.keep_an_eye_period_months;
      }
      const { error } = await supabase.from("crm_tasks").update(updateData).eq("id", taskId);
      if (!error) await fetchAll();
      return { error: error?.message || null };
    },
    [fetchAll]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      data: {
        description?: string;
        scheduled_date?: string | null;
        specifications?: string;
        assigned_to_user_id?: string | null;
        status?: TaskStatus;
        keep_an_eye_date?: string | null;
        keep_an_eye_period_months?: number | null;
        services?: { category_id: string; amount_allocated: number }[];
      }
    ) => {
      const { services, ...taskUpdates } = data;

      const finalUpdates: Record<string, any> = { ...taskUpdates };
      if (services) {
        finalUpdates.total_amount = services.reduce((s, sv) => s + sv.amount_allocated, 0);
      }

      const { error } = await supabase.from("crm_tasks").update(finalUpdates).eq("id", taskId);
      if (error) return { error: error.message };

      if (services) {
        await supabase.from("task_services").delete().eq("task_id", taskId);
        if (services.length > 0) {
          await supabase.from("task_services").insert(
            services.map((s) => ({
              task_id: taskId,
              category_id: s.category_id,
              amount_allocated: s.amount_allocated,
            }))
          );
        }
      }

      await fetchAll();
      return { error: null };
    },
    [fetchAll]
  );

  const createClient = useCallback(
    async (data: { name: string; address: string; phone: string }) => {
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert(data)
        .select()
        .single();
      if (!error && newClient) {
        setClients((prev) => [...prev, newClient as Client]);
      }
      return { data: newClient as Client | null, error: error?.message || null };
    },
    []
  );

  const createCategory = useCallback(
    async (name: string) => {
      const { data: newCat, error } = await supabase
        .from("categories")
        .insert({ name, is_custom: true })
        .select()
        .single();
      if (!error) await fetchAll();
      return { error: error?.message || null };
    },
    [fetchAll]
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  return {
    tasks,
    clients,
    categories,
    employees,
    loading,
    createTask,
    updateTaskStatus,
    updateTask,
    createClient,
    createCategory,
    getTasksByStatus,
    refetch: fetchAll,
  };
}
