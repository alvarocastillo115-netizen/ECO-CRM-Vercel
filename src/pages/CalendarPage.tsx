import { useState, useMemo, useRef } from "react";
import { toPng } from "html-to-image";
import { useCrmData } from "@/hooks/useCrmData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Download } from "lucide-react";
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [selectedTask, setSelectedTask] = useState<CrmTask | null>(null);
  
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
      // Only show: Inspeccion (on inspection_date) and Servicio Agendado (on service_date)
      if (t.status === "Inspeccion" && t.inspection_date) {
        const key = t.inspection_date;
        if (!map[key]) map[key] = [];
        map[key].push({ task: t, type: "inspection" });
      } else if (t.status === "Servicio Agendado" && t.service_date) {
        const key = t.service_date;
        if (!map[key]) map[key] = [];
        map[key].push({ task: t, type: "service" });
      }
    });
    return map;
  }, [tasks]);

  // Week view: dynamic time grid data — only Inspeccion + Servicio Agendado
  const weekData = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const byDateHour: Record<string, Record<number, { task: CrmTask; type: "inspection" | "service" }[]>> = {};
    const hourSet = new Set<number>();

    weekDays.forEach((day) => {
      byDateHour[format(day, "yyyy-MM-dd")] = {};
    });

    tasks.forEach((t) => {
      let dateKey: string | null = null;
      let type: "inspection" | "service" = "service";

      if (t.status === "Inspeccion" && t.inspection_date) {
        dateKey = t.inspection_date; type = "inspection";
      } else if (t.status === "Servicio Agendado" && t.service_date) {
        dateKey = t.service_date; type = "service";
      }

      if (!dateKey || !byDateHour[dateKey]) return;

      let hour = 8;
      const timeStr = type === "inspection" ? t.inspection_time : t.service_time;

      if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
        hour = parseInt(timeStr.split(":")[0], 10);
      } else if (timeStr === "AM") { hour = 8; }
      else if (timeStr === "PM") { hour = 14; }

      if (!byDateHour[dateKey][hour]) byDateHour[dateKey][hour] = [];
      byDateHour[dateKey][hour].push({ task: t, type });
      hourSet.add(hour);
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
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="ml-2 h-9">
            Hoy
          </Button>
          <Button variant="default" size="sm" onClick={handleExportImage} disabled={isExporting} className="ml-2 h-9 bg-primary text-primary-foreground hover:bg-primary/90">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Compartir (PNG)
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
              <div className="grid border-b border-border bg-slate-50 sticky top-0 z-10" style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}>
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
                <div key={hour} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}>
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
                      <div key={dateKey} className={`border-r border-border last:border-r-0 p-1.5 min-h-[60px] ${isToday ? "bg-primary/5" : "bg-background"}`}>
                        <div className="space-y-1">
                          {cellTasks.map(({ task, type }) => {
                            // Sidebar deep teal for services, orange for inspections
                            const bgColor = type === "inspection"
                              ? "bg-[#FF6600] text-white"
                              : "bg-[#0d3b3f] text-white";
                            const timeStr = type === "inspection" ? task.inspection_time : task.service_time;
                            const timeLabel = timeStr ? timeStr.substring(0, 5) : null;
                            return (
                              <button
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium ${bgColor} hover:opacity-85 transition-opacity`}
                              >
                                <div className="flex justify-between items-center gap-1">
                                  <span className="flex-1 overflow-hidden whitespace-nowrap leading-tight">{task.client?.name || "Sin cliente"}</span>
                                  {timeLabel && (
                                    <span className="text-[9px] bg-black/20 px-1 py-0.5 rounded font-bold shrink-0 tabular-nums">{timeLabel}</span>
                                  )}
                                </div>
                                <div className="text-[9px] opacity-80 mt-0.5 leading-tight">
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
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                const renderTask = ({ task, type }: { task: any; type: string }) => {
                  // Sidebar deep teal for services, orange for inspections
                  const bgColor = type === "inspection"
                    ? "bg-[#FF6600] text-white"
                    : "bg-[#0d3b3f] text-white";
                  const timeStr = type === "inspection" ? task.inspection_time : task.service_time;
                  const timeLabel = timeStr ? timeStr.substring(0, 5) : null;
                  return (
                    <button
                      key={task.id + type}
                      onClick={() => setSelectedTask(task)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium ${bgColor} hover:opacity-80 transition-opacity flex justify-between items-center gap-1 overflow-hidden`}
                    >
                      <span className="flex-1 overflow-hidden whitespace-nowrap">{type === "inspection" ? "Insp: " : "Serv: "}{task.client?.name || "Sin cliente"}</span>
                      {timeLabel && (
                        <span className="text-[8px] bg-black/20 px-1 py-0.5 rounded-sm font-bold shrink-0">{timeLabel}</span>
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
                  </div>
                );
              })}
            </div>
          </>
        )}
        </Card>
      </div>

      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        categories={categories}
        employees={employees}
        onUpdateTask={updateTask}
        onUpdateStatus={updateTaskStatus}
        readOnly={true}
      />
    </div>
  );
}
