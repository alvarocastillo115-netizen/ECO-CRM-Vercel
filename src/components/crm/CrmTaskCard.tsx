import { CrmTask } from "@/types/crm";
import { Calendar, DollarSign, AlertTriangle, GripVertical, User, Tag } from "lucide-react";
import { format, addMonths, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

interface CrmTaskCardProps {
  task: CrmTask;
  columnColor: string;
  onClick: () => void;
}

const SERVICE_COLORS: Record<string, string> = {
  "Limpieza": "bg-blue-100 text-blue-700 border-blue-200",
  "Jardinería": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Fumigación": "bg-amber-100 text-amber-700 border-amber-200",
  "Mantenimiento": "bg-purple-100 text-purple-700 border-purple-200",
  "default": "bg-slate-100 text-slate-700 border-slate-200"
};

function isKeepAnEyeAlert(task: CrmTask): boolean {
  if (!task.keep_an_eye_date || !task.keep_an_eye_period_months) return false;
  const recontactDate = addMonths(new Date(task.keep_an_eye_date), task.keep_an_eye_period_months);
  return isAfter(new Date(), recontactDate);
}

export function CrmTaskCard({ task, columnColor, onClick }: CrmTaskCardProps) {
  const alert = isKeepAnEyeAlert(task);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden",
        alert && "ring-2 ring-destructive bg-destructive/5"
      )}
    >
      {/* Accent bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: columnColor }} 
      />

      <div className="p-3 pl-3.5">
        {/* Top Info */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-[15px] font-bold text-slate-900 leading-tight flex items-center gap-2">
            {task.client?.name || "Cliente Sin Nombre"}
            {task.client?.is_fixed && (
              <span title="Cliente Fijo" className="text-[10px] text-orange-600 bg-orange-100 px-1 py-0.5 rounded font-bold leading-none translate-y-px">
                ★ FIJO
              </span>
            )}
          </h3>
          <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* User/Avatar Row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
               <User className="h-3 w-3" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {task.inspection_date && (
              <div className="flex items-center gap-1 text-[#E37910] bg-[#E37910]/10 px-1.5 py-0.5 rounded w-fit">
                <Calendar className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Insp: {format(new Date(task.inspection_date + "T12:00:00"), "dd MMM")}</span>
              </div>
            )}
            {task.service_date && ["Servicio Agendado", "Servicio en proceso", "Servicio completado"].includes(task.status) && (
              <div className="flex items-center gap-1 text-[#09B549] bg-[#09B549]/10 px-1.5 py-0.5 rounded w-fit">
                <Calendar className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Serv: {format(new Date(task.service_date + "T12:00:00"), "dd MMM")}</span>
              </div>
            )}
            {!task.inspection_date && !task.service_date && (
              <div className="text-[10px] text-slate-400 font-medium">Sin fechas programadas</div>
            )}
            {task.total_amount > 0 && (
              <div className="flex items-center gap-1.5 p-1 px-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1 w-fit">
                <DollarSign className="h-3 w-3" />
                <span className="text-[11px] font-bold">${Number(task.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Service badges (Dynamic colors) */}
        {task.services && task.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {task.services.map((s) => {
              const name = s.category?.name || "Servicio";
              const colorInfo = SERVICE_COLORS[name] || SERVICE_COLORS["default"];
              return (
                <span
                  key={s.id}
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border",
                    colorInfo
                  )}
                >
                  {name}
                </span>
              );
            })}
          </div>
        )}

        {alert && (
          <div className="flex items-center gap-1.5 mt-2 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            <span className="text-[10px] font-bold uppercase">Re-contactar</span>
          </div>
        )}
      </div>
    </div>
  );
}

