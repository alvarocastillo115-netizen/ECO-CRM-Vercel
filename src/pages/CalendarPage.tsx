import { useState, useMemo } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { TaskDetailDialog } from "@/components/crm/TaskDetailDialog";
import type { CrmTask } from "@/types/crm";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

export default function CalendarPage() {
  const { tasks, categories, employees, loading, updateTask, updateTaskStatus } = useCrmData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<CrmTask | null>(null);

  const tasksByDate = useMemo(() => {
    const map: Record<string, CrmTask[]> = {};
    tasks.forEach((t) => {
      if (t.scheduled_date) {
        const key = t.scheduled_date;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const statusColor: Record<string, string> = {
    "To-Do": "bg-muted text-muted-foreground",
    "In Progress": "bg-primary/10 text-primary",
    "Completed": "bg-emerald-100 text-emerald-700",
    "Keep an Eye": "bg-amber-100 text-amber-700",
    "Need Revision": "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vista mensual de tareas programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="ml-2">
            Hoy
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="shadow-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-border p-1.5 transition-colors ${
                  !isCurrentMonth ? "bg-muted/30" : "bg-background"
                } ${isToday ? "bg-primary/5" : ""}`}
              >
                <span
                  className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-2xs font-medium truncate ${statusColor[task.status] || "bg-muted"} hover:opacity-80 transition-opacity`}
                    >
                      {task.client?.name || "Sin cliente"}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-2xs text-muted-foreground pl-1">+{dayTasks.length - 3} más</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        categories={categories}
        employees={employees}
        onUpdateTask={updateTask}
        onUpdateStatus={updateTaskStatus}
      />
    </div>
  );
}
