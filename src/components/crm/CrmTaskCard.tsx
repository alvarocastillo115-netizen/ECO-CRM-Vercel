import { CrmTask } from "@/types/crm";
import { Calendar, DollarSign, AlertTriangle, GripVertical } from "lucide-react";
import { format, addMonths, isAfter } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface CrmTaskCardProps {
  task: CrmTask;
  onClick: () => void;
}

function isKeepAnEyeAlert(task: CrmTask): boolean {
  if (task.status !== "Keep an Eye" || !task.keep_an_eye_date || !task.keep_an_eye_period_months) return false;
  const recontactDate = addMonths(new Date(task.keep_an_eye_date), task.keep_an_eye_period_months);
  return isAfter(new Date(), recontactDate);
}

export function CrmTaskCard({ task, onClick }: CrmTaskCardProps) {
  const alert = isKeepAnEyeAlert(task);
  const serviceCount = task.services?.length || 0;
  const filledServices = task.services?.filter((s) => s.amount_allocated > 0).length || 0;
  const progress = serviceCount > 0 ? (filledServices / serviceCount) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card rounded-xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
        alert && "ring-2 ring-destructive bg-destructive/5"
      )}
    >
      <div className="p-3.5">
        {/* Alert icon */}
        {alert && (
          <div className="flex items-center gap-1.5 mb-2 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse-alert" />
            <span className="text-2xs font-semibold">Re-contactar cliente</span>
          </div>
        )}

        {/* Client name */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            {task.client?.name || "Cliente"}
          </h3>
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>

        {/* Service badges */}
        {task.services && task.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.services.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-2xs font-medium bg-accent text-accent-foreground"
              >
                {s.category?.name || "Servicio"}
              </span>
            ))}
          </div>
        )}

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {task.description}
          </p>
        )}

        {/* Progress bar */}
        {serviceCount > 1 && (
          <div className="mb-2">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Footer: amount + date */}
        <div className="flex items-center justify-between text-2xs text-muted-foreground">
          <div className="flex items-center gap-1 font-semibold text-foreground tabular-nums">
            <DollarSign className="h-3 w-3" />
            {Number(task.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          {task.scheduled_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.scheduled_date), "MMM d")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
