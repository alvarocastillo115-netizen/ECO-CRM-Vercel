import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import type { CrmTask, Client } from "@/types/crm";

export interface TrendData {
  date: string;
  value: number;
}

export interface SellerServiceData {
  seller: string;
  [service: string]: string | number;
}

export const getTrendsData = (tasks: CrmTask[]): TrendData[] => {
  const completed = tasks.filter((t) => t.status === "Servicio finalizado");
  const weeklyMap: Record<string, number> = {};
  
  completed.forEach((t) => {
    const weekStart = format(startOfWeek(parseISO(t.created_at), { weekStartsOn: 1 }), "yyyy-MM-dd");
    weeklyMap[weekStart] = (weeklyMap[weekStart] || 0) + Number(t.total_amount);
  });

  return Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, value]) => ({
      date: format(parseISO(week), "dd MMM", { locale: es }),
      value,
    }));
};

export const getSalesBySellerData = (tasks: CrmTask[], employees: { id: string; full_name: string | null }[]) => {
  const completed = tasks.filter((t) => t.status === "Servicio finalizado");
  const sellerMap: Record<string, Record<string, number>> = {};

  completed.forEach((t) => {
    const sellerName = employees.find(e => e.id === t.assigned_to_user_id)?.full_name || "Sin Asignar";
    if (!sellerMap[sellerName]) sellerMap[sellerName] = {};
    
    t.services?.forEach(s => {
      const sname = s.category?.name || "Otros";
      sellerMap[sellerName][sname] = (sellerMap[sellerName][sname] || 0) + Number(s.amount_allocated);
    });
  });

  return Object.entries(sellerMap).map(([seller, services]) => ({
    seller,
    ...services
  }));
};

export const getFilteredCommissions = (
  tasks: CrmTask[], 
  startDate?: Date, 
  endDate?: Date
) => {
  const completed = tasks.filter((t) => t.status === "Servicio finalizado");
  
  return completed.filter(t => {
    if (!startDate || !endDate) return true;
    const date = parseISO(t.created_at);
    return isWithinInterval(date, { start: startDate, end: endDate });
  });
};

export const calculateLastServiceDate = (clients: Client[], tasks: CrmTask[]) => {
  const lastServiceMap: Record<string, string> = {};
  
  tasks.forEach(t => {
    if (t.status === "Servicio finalizado" && t.scheduled_date) {
      const currentLast = lastServiceMap[t.client_id];
      if (!currentLast || t.scheduled_date > currentLast) {
        lastServiceMap[t.client_id] = t.scheduled_date;
      }
    }
  });

  return clients.map(c => ({
    ...c,
    last_service_date: lastServiceMap[c.id] || null
  }));
};
