export type TaskStatus = "To-Do" | "In Progress" | "Completed" | "Keep an Eye" | "Need Revision";

export interface CrmTask {
  id: string;
  client_id: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  scheduled_date: string | null;
  total_amount: number;
  keep_an_eye_date: string | null;
  keep_an_eye_period_months: number | null;
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
  phone: string;
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
  { id: "To-Do", title: "To-Do", color: "hsl(215, 15%, 60%)" },
  { id: "In Progress", title: "In Progress", color: "hsl(215, 55%, 24%)" },
  { id: "Completed", title: "Completed", color: "hsl(153, 83%, 30%)" },
  { id: "Keep an Eye", title: "Keep an Eye", color: "hsl(38, 92%, 50%)" },
  { id: "Need Revision", title: "Need Revision", color: "hsl(0, 72%, 51%)" },
];

export const CATEGORY_ICONS: Record<string, string> = {
  "Pulido de pisos": "Sparkles",
  "Limpieza de vidrios": "GlassWater",
  "Trampas de grasa": "Flame",
  "Limpieza de baños": "Droplets",
  "Pintura": "Paintbrush",
};
