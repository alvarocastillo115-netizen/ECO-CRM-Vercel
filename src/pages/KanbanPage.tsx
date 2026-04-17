import { useState } from "react";
import { STATUS_COLUMNS, TaskStatus, CrmTask } from "@/types/crm";
import { useCrmData } from "@/hooks/useCrmData";
import { CrmKanbanColumn } from "@/components/crm/CrmKanbanColumn";
import { CreateTaskDialog } from "@/components/crm/CreateTaskDialog";
import { TaskDetailDialog } from "@/components/crm/TaskDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import { Plus, RefreshCw, Loader2, CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

export default function KanbanPage() {
  const { isAdmin } = useAuth();
  const {
    tasks, clients, categories, employees, loading,
    createTask, updateTaskStatus, updateTask, createClient, getTasksByStatus, refetch,
  } = useCrmData();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogStatus, setCreateDialogStatus] = useState<TaskStatus>("Primer contacto");
  const [detailTask, setDetailTask] = useState<CrmTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  
  const [filterClient, setFilterClient] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [filterService, setFilterService] = useState<"all" | string>("all");
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const kanbanColumns = STATUS_COLUMNS;
  const filteredTableTasks = tasks
    .filter(t => t.status !== "Servicio completado")
    .filter(t => filterStatus === "all" || t.status === filterStatus)
    .filter(t => {
      const cName = t.client?.name?.toLowerCase() || "";
      return cName.includes(filterClient.toLowerCase());
    })
    .filter(t => {
      if (!filterEmployee) return true;
      const empName = employees.find(e => e.id === t.assigned_to_user_id)?.full_name?.toLowerCase() || "";
      return empName.includes(filterEmployee.toLowerCase());
    })
    .filter(t => {
      if (filterService === "all") return true;
      return t.services?.some(s => s.category_id === filterService) ?? false;
    })
    .filter(t => {
      if (!filterDateRange?.from) return true;
      const dateStr = t.service_date || t.inspection_date;
      if (!dateStr) return false;
      try {
        const taskDate = parseISO(dateStr);
        const from = startOfDay(filterDateRange.from);
        const to = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);
        return isWithinInterval(taskDate, { start: from, end: to });
      } catch { return false; }
    })
    .sort((a, b) => {
      return sortOrder === "desc"
        ? b.total_amount - a.total_amount
        : a.total_amount - b.total_amount;
    });

  const hasFilters = filterClient || filterEmployee || filterStatus !== "all" || filterService !== "all" || !!filterDateRange?.from;
  const clearAllFilters = () => {
    setFilterClient(""); setFilterEmployee(""); setFilterStatus("all"); setFilterService("all"); setFilterDateRange(undefined);
  };

  const handleAddClick = (status: TaskStatus) => {
    setCreateDialogStatus(status);
    setCreateDialogOpen(true);
  };

  const handleTaskClick = (task: CrmTask) => {
    setDetailTask(task);
    setDetailOpen(true);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      // Preserve scroll position to prevent view jumping
      const scrollEl = document.querySelector(".kanban-board-scroll") as HTMLElement | null;
      const savedScrollLeft = scrollEl?.scrollLeft ?? 0;
      const savedScrollTop = scrollEl?.scrollTop ?? 0;
      await updateTaskStatus(taskId, status);
      requestAnimationFrame(() => {
        if (scrollEl) {
          scrollEl.scrollLeft = savedScrollLeft;
          scrollEl.scrollTop = savedScrollTop;
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Servicios Activos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} tareas registradas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-muted rounded-md p-0.5 items-center">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${viewMode === "kanban" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              Vista Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${viewMode === "table" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              Vista Tabla
            </button>
          </div>
          {isAdmin && (
            <>
              <div className="h-6 w-px bg-border" />
              <Button size="sm" onClick={() => handleAddClick("Primer contacto")} className="text-sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva Tarea
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-slate-50 border-t">
        {viewMode === "kanban" ? (
          <div className="kanban-board-scroll flex h-full gap-4 px-6 py-4 w-max min-w-full overflow-auto">
            {kanbanColumns.map((col) => (
              <CrmKanbanColumn
                key={col.id}
                status={col.id}
                title={col.title}
                color={col.color}
                tasks={getTasksByStatus(col.id)}
                onAddClick={() => handleAddClick(col.id)}
                onTaskClick={handleTaskClick}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                isDragOver={dragOverColumn === col.id}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 h-full flex flex-col gap-4">
            <div className="flex gap-3 items-center bg-white p-3 rounded-md border shadow-sm flex-wrap">
              <Input 
                placeholder="Filtrar por Cliente..." 
                value={filterClient} 
                onChange={(e) => setFilterClient(e.target.value)} 
                className="max-w-[180px] bg-white h-9" 
              />
              <Input 
                placeholder="Filtrar por Vendedor..." 
                value={filterEmployee} 
                onChange={(e) => setFilterEmployee(e.target.value)} 
                className="max-w-[180px] bg-white h-9" 
              />
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | TaskStatus)}>
                <SelectTrigger className="h-9 w-[180px] bg-white">
                  <SelectValue placeholder="Todos los estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estatus</SelectItem>
                  {STATUS_COLUMNS.filter(c => c.id !== "Servicio completado").map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
                        {col.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Service/Category filter */}
              <Select value={filterService} onValueChange={(v) => setFilterService(v)}>
                <SelectTrigger className="h-9 w-[180px] bg-white">
                  <SelectValue placeholder="Todos los servicios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Date Range Picker */}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 gap-2 font-normal ${filterDateRange?.from ? "border-primary text-primary bg-primary/5" : "text-muted-foreground"}`}
                  >
                    <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                    {filterDateRange?.from ? (
                      filterDateRange.to && filterDateRange.to.getTime() !== filterDateRange.from.getTime()
                        ? `${format(filterDateRange.from, "dd MMM", { locale: es })} – ${format(filterDateRange.to, "dd MMM", { locale: es })}`
                        : format(filterDateRange.from, "dd MMM yyyy", { locale: es })
                    ) : (
                      <span>Filtrar por fecha</span>
                    )}
                    {filterDateRange?.from && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setFilterDateRange(undefined); }}
                        className="ml-1 rounded-full hover:bg-primary/20 p-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filterDateRange?.from}
                    selected={filterDateRange}
                    onSelect={(range) => {
                      setFilterDateRange(range);
                      if (range?.from && range?.to) setDatePickerOpen(false);
                    }}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              >
                Monto: {sortOrder === "desc" ? "Mayor a Menor" : "Menor a Mayor"}
              </Button>
              {hasFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground text-xs h-9"
                  onClick={clearAllFilters}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
            <div className="border rounded-md shadow-sm bg-white overflow-hidden flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[180px]">Cliente</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead>Servicios</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Fechas Programadas</TableHead>
                    <TableHead>Empleado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTableTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay tareas que coincidan con los filtros</TableCell>
                    </TableRow>
                  ) : (
                    filteredTableTasks.map((task) => {
                      const col = STATUS_COLUMNS.find(c => c.id === task.status);
                      const employee = employees.find(e => e.id === task.assigned_to_user_id);
                      return (
                        <TableRow key={task.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleTaskClick(task)}>
                          <TableCell className="font-semibold text-slate-800">
                            {task.client?.name || "Sin Nombre"}
                            {task.client?.is_fixed && <span className="ml-2 text-[10px] text-orange-600 bg-orange-100 px-1 py-0.5 rounded font-bold">★ FIJO</span>}
                          </TableCell>
                          <TableCell>
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-full text-white inline-block tracking-wide"
                              style={{ backgroundColor: col?.color || "#666" }}
                            >
                              {col?.title || task.status}
                            </span>
                          </TableCell>
                          {/* Servicios column */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {task.services && task.services.length > 0
                                ? task.services.map(s => (
                                    <span
                                      key={s.id}
                                      className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 whitespace-nowrap border border-slate-200"
                                    >
                                      {s.category?.name || "—"}
                                    </span>
                                  ))
                                : <span className="text-xs text-muted-foreground italic">Sin servicios</span>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="font-bold whitespace-nowrap">
                            ${Number(task.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs text-slate-500">
                              {task.inspection_date && <span>Insp: {format(new Date(task.inspection_date + "T12:00:00"), "dd MMM yyyy")}</span>}
                              {task.service_date && <span className="text-emerald-600 font-medium">Serv: {format(new Date(task.service_date + "T12:00:00"), "dd MMM yyyy")}</span>}
                              {!task.inspection_date && !task.service_date && <span>N/A</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {employee ? (employee.full_name || employee.email) : "Sin asignar"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
        categories={categories}
        employees={employees}
        defaultStatus={createDialogStatus}
        onCreateTask={createTask}
        onCreateClient={createClient}
      />

      <TaskDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        task={detailTask}
        categories={categories}
        employees={employees}
        onUpdateTask={updateTask}
        onUpdateStatus={updateTaskStatus}
      />
    </div>
  );
}
