export type TaskStatus = "Primer contacto" | "Inspeccion" | "Cotizacion" | "Servicio Agendado" | "Servicio en proceso" | "Servicio finalizado";

export interface CrmTask {
  id: string;
  client_id: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  inspection_date: string | null;
  service_date: string | null;
  total_amount: number;
  keep_an_eye_date: string | null;
  keep_an_eye_period_months: number | null;
  inspection_time?: string;
  service_time?: "AM" | "PM" | string;
  assigned_to_user_id: string | null;
  specifications: string;
  updated_at: string;
  // Joined data
  client?: Client;
  services?: TaskService[];
}

export interface Client {
  id: string;
  name: string;
  address: string;
  is_fixed?: boolean;
  phone: string;
  branch: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  is_custom: boolean;
  created_at: string;
}

export interface TaskService {
  id: string;
  task_id: string;
  category_id: string;
  amount_allocated: number;
  category?: Category;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export type AppRole = "admin" | "employee";

export const STATUS_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "Primer contacto", title: "Primer Contacto", color: "#FF0000" },
  { id: "Inspeccion", title: "Inspección", color: "#FF6600" },
  { id: "Cotizacion", title: "Cotización", color: "#36FF7D" },
  { id: "Servicio Agendado", title: "Servicio Agendado", color: "#003300" },
  { id: "Servicio en proceso", title: "Servicio en Proceso", color: "#000066" },
  { id: "Servicio finalizado", title: "Servicio Finalizado", color: "#256764" },
];

export const CATEGORY_ICONS: Record<string, string> = {
  "Pulido de pisos": "Sparkles",
  "Limpieza de vidrios": "GlassWater",
  "Trampas de grasa": "Flame",
  "Limpieza de baños": "Droplets",
  "Pintura": "Paintbrush",
};
