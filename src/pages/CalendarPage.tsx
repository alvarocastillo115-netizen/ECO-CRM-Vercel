import { useState, useMemo, useRef } from "react";
import { toPng } from "html-to-image";
import { useCrmData } from "@/hooks/useCrmData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Download, Plus } from "lucide-react";
import { TaskDetailDialog } from "@/components/crm/TaskDetailDialog";
import { CreateTaskDialog } from "@/components/crm/CreateTaskDialog";
import type { CrmTask, TaskStatus } from "@/types/crm";
import { STATUS_COLUMNS } from "@/types/crm";
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
  const { tasks, clients, categories, employees, loading, createTask, createClient, updateTask, updateTaskStatus, deleteTask } = useCrmData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [selectedTask, setSelectedTask] = useState<CrmTask | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportImage = async () => {
    if (!calendarRef.current) return;
    setIsExporting(true);
    
    const titleEl = document.getElementById("calendar-print-title");
    if (titleEl) titleEl.classList.remove("hidden");

    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const dataUrl = await toPng(calendarRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ECO-Calendario-${format(currentDate, "MMMM-yyyy", { locale: es })}.png`;
      a.click();
    } catch (error) {
      console.error(error);
    } finally {
      if (titleEl) titleEl.classList.add("hidden");
      setIsExporting(false);
    }
  };

  const tasksByDate = useMemo(() => {
    const map: Record<string, { task: CrmTask, type: "inspection" | "service" }[]> = {};
    tasks.forEach((t) => {
      // Show: Inspeccion (on inspection_date), Servicio Agendado / en proceso
      // (on service_date), and Revisar Urgente on whichever date is set
      // (prefer service_date so the task lands on the day it was actually
      // expected to happen).
      if (t.status === "Inspeccion" && t.inspection_date) {
        const key = t.inspection_date;
        if (!map[key]) map[key] = [];
        map[key].push({ task: t, type: "inspection" });
      } else if ((t.status === "Servicio Agendado" || t.status === "Servicio en proceso") && t.service_date) {
        const key = t.service_date;
        if (!map[key]) map[key] = [];
        map[key].push({ task: t, type: "service" });
      } else if (t.status === "Revisar Urgente" && (t.service_date || t.inspection_date)) {
        const key = (t.service_date || t.inspection_date) as string;
        if (!map[key]) map[key] = [];
        map[key].push({ task: t, type: t.service_date ? "service" : "inspection" });
      }
    });
    return map;
  }, [tasks]);

  // Week view: dynamic time grid data — only Inspeccion + Servicio Agendado/en proceso
  const weekData = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const byDateHour: Record<string, Record<number, { task: CrmTask; type: "inspection" | "service"; minutes: number }[]>> = {};
    const hourSet = new Set<number>();

    weekDays.forEach((day) => {
      byDateHour[format(day, "yyyy-MM-dd")] = {};
    });

    tasks.forEach((t) => {
      let dateKey: string | null = null;
      let type: "inspection" | "service" = "service";

      if (t.status === "Inspeccion" && t.inspection_date) {
        dateKey = t.inspection_date; type = "inspection";
      } else if ((t.status === "Servicio Agendado" || t.status === "Servicio en proceso") && t.service_date) {
        dateKey = t.service_date; type = "service";
      } else if (t.status === "Revisar Urgente" && (t.service_date || t.inspection_date)) {
        dateKey = (t.service_date || t.inspection_date) as string;
        type = t.service_date ? "service" : "inspection";
      }

      if (!dateKey || !byDateHour[dateKey]) return;

      let hour = 8;
      let minutes = 0;
      const timeStr = type === "inspection" ? t.inspection_time : t.service_time;

      // Accept "HH:MM" or "HH:MM - HH:MM" (range). Pull the start time only.
      const match = timeStr?.match(/^(\d{1,2}):(\d{2})/);
      if (match) {
        hour = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
      } else if (timeStr === "AM") { hour = 8; }
      else if (timeStr === "PM") { hour = 14; }

      if (!byDateHour[dateKey][hour]) byDateHour[dateKey][hour] = [];
      byDateHour[dateKey][hour].push({ task: t, type, minutes });
      hourSet.add(hour);
    });

    // Sort each cell by minutes ascending so cards are visually ordered.
    Object.values(byDateHour).forEach((dayBuckets) => {
      Object.values(dayBuckets).forEach((arr) => arr.sort((a, b) => a.minutes - b.minutes));
    });

    const hours = Array.from(hourSet).sort((a, b) => a - b);
    return { byDateHour, hours, weekDays };
  }, [tasks, currentDate]);

  const calendarDays = useMemo(() => {
    let start: Date;
    let end: Date;

    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart, { weekStartsOn: 1 });
      end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    } else {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    }

    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate, viewMode]);

  // Ingresos por día (solo Servicio Agendado, en proceso y completado, por service_date).
  // Los completados se incluyen aunque ya no aparezcan como tarjeta en el calendario.
  const revenueByStatusByDate = useMemo(() => {
    const map: Record<string, { agendado: number; proceso: number; completado: number }> = {};
    tasks.forEach((t) => {
      if (!t.service_date) return;
      if (t.status !== "Servicio Agendado" && t.status !== "Servicio en proceso" && t.status !== "Servicio completado") return;
      if (!map[t.service_date]) map[t.service_date] = { agendado: 0, proceso: 0, completado: 0 };
      const amount = Number(t.total_amount) || 0;
      if (t.status === "Servicio Agendado") map[t.service_date].agendado += amount;
      else if (t.status === "Servicio en proceso") map[t.service_date].proceso += amount;
      else map[t.service_date].completado += amount;
    });
    return map;
  }, [tasks]);

  const getDayTotal = (dateKey: string) => {
    const r = revenueByStatusByDate[dateKey];
    return r ? r.agendado + r.proceso + r.completado : 0;
  };

  // Resumen del periodo visible (semana o mes) para la esquina inferior derecha.
  const periodSummary = useMemo(() => {
    const days = viewMode === "week" ? weekData.weekDays : calendarDays;
    const sum = { agendado: 0, proceso: 0, completado: 0 };
    days.forEach((day) => {
      const r = revenueByStatusByDate[format(day, "yyyy-MM-dd")];
      if (!r) return;
      sum.agendado += r.agendado;
      sum.proceso += r.proceso;
      sum.completado += r.completado;
    });
    return { ...sum, total: sum.agendado + sum.proceso + sum.completado };
  }, [viewMode, weekData, calendarDays, revenueByStatusByDate]);

  const statusColor: Record<string, string> = {
    "Primer contacto": "bg-[#E3B075]/20 text-[#E3B075]",
    "Inspeccion": "bg-[#E37910]",
    "Cotizacion": "bg-[#FFF293]/50 text-yellow-800",
    "Servicio Agendado": "bg-[#09B549]",
    "Servicio en proceso": "bg-[#FE9F43]",
    "Servicio completado": "bg-[#256764]",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vista {viewMode === "month" ? "mensual" : "semanal"} de servicios programados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted p-1 rounded-lg">
            <Button 
              variant={viewMode === "week" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-7 text-xs" 
              onClick={() => setViewMode("week")}
            >
              Semana
            </Button>
            <Button 
              variant={viewMode === "month" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-7 text-xs" 
              onClick={() => setViewMode("month")}
            >
              Mes
            </Button>
          </div>

          <div className="flex items-center gap-1 border rounded-lg p-1 ml-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentDate(viewMode === "month" ? subMonths(currentDate, 1) : addDays(currentDate, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center capitalize">
              {viewMode === "month" 
                ? format(currentDate, "MMMM yyyy", { locale: es })
                : `${format(calendarDays[0], "dd MMM", { locale: es })} - ${format(calendarDays[6], "dd MMM", { locale: es })}`}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentDate(viewMode === "month" ? addMonths(currentDate, 1) : addDays(currentDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="default" size="sm" onClick={handleExportImage} disabled={isExporting} className="ml-2 h-9 bg-primary text-primary-foreground hover:bg-primary/90">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Compartir (PNG)
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="h-9">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Calendar Grid Wrapper */}
      <div ref={calendarRef} className="bg-background pt-2 rounded-xl">
        {/* Included a title inside the image dynamically to provide context when shared */}
        <div id="calendar-print-title" className="hidden mb-6 px-2">
          <div className="flex justify-between items-end border-b-2 border-primary/20 pb-4">
            <div className="font-bold text-2xl text-primary capitalize">
              Calendario {viewMode === "month" ? format(currentDate, "MMMM yyyy", { locale: es }) : `Semanal: ${format(calendarDays[0], "dd MMM", { locale: es })} - ${format(calendarDays[6], "dd MMM", { locale: es })}`}
            </div>
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Extraído: <span className="text-foreground">{format(new Date(), "dd/MM/yyyy HH:mm")}</span>
            </div>
          </div>
        </div>
        <Card className="shadow-card overflow-hidden">
          {viewMode === "week" ? (
          // ── WEEK VIEW: Dynamic time grid ──────────────────────────────────
          weekData.hours.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm">No hay servicios programados esta semana.</p>
            </div>
          ) : (
            <div className="overflow-auto">
              {/* Header: blank + day columns */}
              <div className="grid border-b border-border bg-slate-50 sticky top-0 z-10" style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}>
                <div className="border-r border-border" />
                {weekData.weekDays!.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className={`py-2 px-2 text-center border-r border-border last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {format(day, "EEE", { locale: es })}
                      </div>
                      <div className={`text-sm font-bold mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-full mx-auto ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hour rows — only hours with tasks */}
              {weekData.hours.map((hour) => (
                <div key={hour} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}>
                  {/* Hour label */}
                  <div className="border-r border-border flex items-start justify-end pr-2 pt-2">
                    <span className="text-[10px] font-mono font-semibold text-slate-400">
                      {String(hour).padStart(2, "0")}:00
                    </span>
                  </div>
                  {/* Day cells */}
                  {weekData.weekDays!.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const cellTasks = weekData.byDateHour[dateKey]?.[hour] || [];
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={dateKey} className={`relative border-r border-border last:border-r-0 p-1.5 min-h-[88px] ${isToday ? "bg-primary/5" : "bg-background"}`}>
                        <div className="space-y-1">
                          {cellTasks.map(({ task, type, minutes }) => {
                            // Pastel colors per status with dark text for contrast.
                            // Revisar Urgente uses pink-red even if it originally came from
                            // inspection or service date.
                            const bgColor =
                              task.status === "Revisar Urgente"
                                ? "bg-[#ED9CAD] text-slate-900"
                                : task.status === "Inspeccion"
                                  ? "bg-[#FEF9C3] text-slate-900"
                                  : task.status === "Servicio Agendado"
                                    ? "bg-[#EDE9FE] text-slate-900"
                                    : task.status === "Servicio en proceso"
                                      ? "bg-[#DCFCE7] text-slate-900"
                                      : "bg-slate-100 text-slate-900";
                            const timeStr = type === "inspection" ? task.inspection_time : task.service_time;
                            const timeLabel = timeStr ? timeStr.substring(0, 5) : null;
                            // Push the card down within its hour cell proportionally to
                            // its start minutes so e.g. 10:30 visually sits halfway
                            // between the 10:00 and 11:00 rows. ~1px per minute against
                            // the 64px usable height of the cell.
                            const offsetPx = Math.round((minutes / 60) * 64);
                            return (
                              <button
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                style={offsetPx > 0 ? { marginTop: `${offsetPx}px` } : undefined}
                                className={`w-full min-w-0 text-left px-2 py-1 rounded text-[13px] font-semibold ${bgColor} hover:opacity-85 transition-opacity`}
                              >
                                <div className="flex justify-between items-center gap-1 min-w-0">
                                  <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap leading-tight">{task.client?.name || "Sin cliente"}</span>
                                  {timeLabel && (
                                    <span className="text-[11px] bg-black/15 px-1.5 py-0.5 rounded font-bold shrink-0 tabular-nums">{timeLabel}</span>
                                  )}
                                </div>
                                <div className="text-[11px] opacity-80 mt-0.5 leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                                  {type === "inspection" ? "Inspección" : task.status}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* Fila de totales por día */}
              <div className="grid border-t-2 border-border bg-slate-50 sticky bottom-0 z-10" style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}>
                <div className="border-r border-border flex items-center justify-end pr-2 py-2">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                </div>
                {weekData.weekDays!.map((day) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dTotal = getDayTotal(dateKey);
                  return (
                    <div key={dateKey} className="border-r border-border last:border-r-0 py-2 px-2 text-center">
                      <span className="text-xs font-bold text-emerald-700 tabular-nums">
                        {dTotal > 0 ? `$${dTotal.toLocaleString("en-US")}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          // ── MONTH VIEW: Original implementation ───────────────────────────
          <>
            <div className="grid grid-cols-7 border-b border-border">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayTasks = tasksByDate[dateKey] || [];
                const dTotal = getDayTotal(dateKey);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                const renderTask = ({ task, type }: { task: any; type: string }) => {
                  // Pastel colors per status with dark text for contrast.
                  const bgColor =
                    task.status === "Revisar Urgente"
                      ? "bg-[#ED9CAD] text-slate-900"
                      : task.status === "Inspeccion"
                        ? "bg-[#FEF9C3] text-slate-900"
                        : task.status === "Servicio Agendado"
                          ? "bg-[#EDE9FE] text-slate-900"
                          : task.status === "Servicio en proceso"
                            ? "bg-[#DCFCE7] text-slate-900"
                            : "bg-slate-100 text-slate-900";
                  const timeStr = type === "inspection" ? task.inspection_time : task.service_time;
                  const timeLabel = timeStr ? timeStr.substring(0, 5) : null;
                  return (
                    <button
                      key={task.id + type}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full min-w-0 text-left px-1.5 py-0.5 rounded text-[12px] font-semibold ${bgColor} hover:opacity-80 transition-opacity flex justify-between items-center gap-1 overflow-hidden`}
                    >
                      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{type === "inspection" ? "Insp: " : "Serv: "}{task.client?.name || "Sin cliente"}</span>
                      {timeLabel && (
                        <span className="text-[10px] bg-black/15 px-1 py-0.5 rounded-sm font-bold shrink-0">{timeLabel}</span>
                      )}
                    </button>
                  );
                };

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-b border-r border-border transition-colors flex flex-col ${
                      !isCurrentMonth ? "bg-muted/30" : "bg-background"
                    } ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div className="px-1.5 pt-1.5 pb-0">
                      <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"
                      }`}>
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="flex-1 px-1.5 pb-1.5 space-y-0.5">
                      {dayTasks.slice(0, 3).map(renderTask)}
                      {dayTasks.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} más</span>
                      )}
                    </div>
                    {dTotal > 0 && (
                      <div className="px-1.5 pb-1 pt-0.5 border-t border-border/50">
                        <span className="text-[10px] font-bold text-emerald-700 tabular-nums">
                          ${dTotal.toLocaleString("en-US")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        </Card>

        {/* Resumen de ingresos del periodo — esquina inferior derecha */}
        <div className="flex justify-end mt-4">
          <div className="bg-white border shadow-xl rounded-lg p-3 min-w-[260px] max-w-xs">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Totales del calendario ({viewMode === "week" ? "semana" : "mes"})
            </div>
            <div className="space-y-1.5">
              {([
                { id: "Servicio Agendado" as const, amount: periodSummary.agendado },
                { id: "Servicio en proceso" as const, amount: periodSummary.proceso },
                { id: "Servicio completado" as const, amount: periodSummary.completado },
              ]).map((row) => {
                const col = STATUS_COLUMNS.find((c) => c.id === row.id);
                return (
                  <div key={row.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: col?.color }} />
                      <span className="truncate font-medium">{col?.title}</span>
                    </span>
                    <span className="font-semibold tabular-nums whitespace-nowrap">${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px]">Total</span>
              <span className="font-bold tabular-nums">${periodSummary.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        categories={categories}
        employees={employees}
        onUpdateTask={updateTask}
        onUpdateStatus={updateTaskStatus}
        onDeleteTask={deleteTask}
        readOnly={false}
      />

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
        categories={categories}
        employees={employees}
        defaultStatus="Primer contacto"
        onCreateTask={createTask}
        onCreateClient={createClient}
      />
    </div>
  );
}
