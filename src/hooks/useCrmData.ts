import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CrmTask, Client, Category, TaskService, Profile, TaskStatus } from "@/types/crm";

export function useCrmData() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsWithDates, setClientsWithDates] = useState<any[]>([]);

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

    const enrichedTasks = (((tasksRes.data || []) as any) as CrmTask[]).map((task) => ({
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

    const lastServiceMap: Record<string, string> = {};
    enrichedTasks.forEach(t => {
      if (t.status === "Servicio completado" && t.service_date) {
        if (!lastServiceMap[t.client_id] || t.service_date > lastServiceMap[t.client_id]) {
          lastServiceMap[t.client_id] = t.service_date;
        }
      }
    });

    const cWithDates = clientsData.map(c => ({
      ...c,
      last_service_date: lastServiceMap[c.id] || null
    }));

    setTasks(enrichedTasks);
    setClients(clientsData);
    setClientsWithDates(cWithDates);
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
      inspection_date: string | null;
      service_date: string | null;
      specifications: string;
      assigned_to_user_id: string | null;
      services: { category_id: string; amount_allocated: number }[];
      status?: TaskStatus;
    }) => {
      const total = data.services.reduce((sum, s) => sum + s.amount_allocated, 0);
      const { data: newTask, error } = await supabase
        .from("crm_tasks")
        .insert({
          client_id: data.client_id,
          description: data.description,
          inspection_date: data.inspection_date,
          service_date: data.service_date,
          specifications: data.specifications,
          assigned_to_user_id: data.assigned_to_user_id,
          total_amount: total,
          status: data.status || "Primer contacto",
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
      status: TaskStatus
    ) => {
      const updateData: any = { status };
      const task = tasks.find((t) => t.id === taskId);
      if (
        status === "Servicio Agendado" ||
        status === "Servicio en proceso" ||
        status === "Servicio completado"
      ) {
        if (task && !task.sale_closed_at) {
          updateData.sale_closed_at = new Date().toISOString();
        }
      }

      const { error } = await supabase.from("crm_tasks").update(updateData).eq("id", taskId);
      if (!error) await fetchAll();
      return { error: error?.message || null };
    },
    [fetchAll, tasks]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      data: {
        description?: string;
        inspection_date?: string | null;
        service_date?: string | null;
        specifications?: string;
        assigned_to_user_id?: string | null;
        status?: TaskStatus;
        services?: { category_id: string; amount_allocated: number }[];
      }
    ) => {
      const { services, ...taskUpdates } = data;

      const finalUpdates: Record<string, any> = { ...taskUpdates };
      if (services) {
        finalUpdates.total_amount = services.reduce((s, sv) => s + sv.amount_allocated, 0);
      }

      if (
        finalUpdates.status === "Servicio Agendado" ||
        finalUpdates.status === "Servicio en proceso" ||
        finalUpdates.status === "Servicio completado"
      ) {
        const task = tasks.find((t) => t.id === taskId);
        if (task && !task.sale_closed_at) {
          finalUpdates.sale_closed_at = new Date().toISOString();
        }
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
    async (data: { name: string; address: string; phone: string; branch?: string; is_fixed?: boolean }) => {
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

  const updateCategory = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("categories").update({ name }).eq("id", id);
    if (!error) await fetchAll();
    return { error: error?.message || null };
  }, [fetchAll]);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) await fetchAll();
    return { error: error?.message || null };
  }, [fetchAll]);

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
    updateCategory,
    deleteCategory,
    getTasksByStatus,
    refetch: fetchAll,
    clientsWithDates,
  };
}
