import { useState, useMemo } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, CalendarRange, X, Search, TrendingUp, Package, DollarSign, Undo2 } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import * as XLSX from "xlsx";
import type { TaskStatus } from "@/types/crm";
import { toast } from "@/hooks/use-toast";

export default function SalesHistoryPage() {
  const { tasks, employees, categories, loading, updateTaskStatus } = useCrmData();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Revert dialog state
  const [revertTaskId, setRevertTaskId] = useState<string | null>(null);
  const [revertStatus, setRevertStatus] = useState<TaskStatus>("Servicio en proceso");
  const [reverting, setReverting] = useState(false);

  const REVERT_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: "Primer contacto", label: "Primer Contacto" },
    { value: "Inspeccion", label: "Inspección" },
    { value: "Cotizacion", label: "Cotización" },
    { value: "Servicio Agendado", label: "Servicio Agendado" },
    { value: "Servicio en proceso", label: "Servicio en Proceso" },
  ];

  // Only "Servicio finalizado" tasks
  const completedTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === "Servicio finalizado")
      .filter(t => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.client?.name?.toLowerCase().includes(q) ||
          employees.find(e => e.id === t.assigned_to_user_id)?.full_name?.toLowerCase().includes(q) ||
          t.specifications?.toLowerCase().includes(q)
        );
      })
      .filter(t => {
        if (!dateRange?.from) return true;
        const dateStr = t.service_date || t.inspection_date || t.updated_at;
        try {
          const d = parseISO(dateStr);
          const from = startOfDay(dateRange.from);
          const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
          return isWithinInterval(d, { start: from, end: to });
        } catch { return false; }
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [tasks, employees, search, dateRange]);

  const totalRevenue = useMemo(() => completedTasks.reduce((s, t) => s + t.total_amount, 0), [completedTasks]);

  const handleRevert = async () => {
    if (!revertTaskId) return;
    setReverting(true);
    await updateTaskStatus(revertTaskId, revertStatus);
    toast({ title: "Tarea revertida", description: `El servicio fue regresado a "${revertStatus}".` });
    setRevertTaskId(null);
    setReverting(false);
  };

  const handleExport = () => {
    const headers = [
      "Cliente", "Sucursal", "Fecha de Servicio", "Monto Total ($)",
      "Vendedor", "Especificaciones",
      ...categories.map(c => c.name),
    ];

    const rows = completedTasks.map(t => {
      const emp = employees.find(e => e.id === t.assigned_to_user_id);
      const serviceDateStr = t.service_date
        ? format(parseISO(t.service_date), "dd/MM/yyyy")
        : t.updated_at
        ? format(parseISO(t.updated_at), "dd/MM/yyyy")
        : "";
      return [
        t.client?.name || "",
        t.client?.branch || "",
        serviceDateStr,
        parseFloat(t.total_amount.toFixed(2)),
        emp?.full_name || emp?.email || "Sin asignar",
        t.specifications || "",
        ...categories.map(c => {
          const svc = t.services?.find(s => s.category_id === c.id);
          return svc ? parseFloat(svc.amount_allocated.toString()) : 0;
        }),
      ];
    });

    const totalsRow = [
      "TOTAL", "", "", parseFloat(totalRevenue.toFixed(2)), "", "",
      ...categories.map(c =>
        parseFloat(completedTasks.reduce((s, t) => {
          const svc = t.services?.find(s => s.category_id === c.id);
          return s + (svc ? Number(svc.amount_allocated) : 0);
        }, 0).toFixed(2))
      ),
    ];

    const wsData = [headers, ...rows, totalsRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 22 }, { wch: 36 },
      ...categories.map(() => ({ wch: 18 })),
    ];

    const today = format(new Date(), "dd-MM-yyyy");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `Historial de Ventas ${today}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Revert Confirmation Dialog */}
      <AlertDialog open={!!revertTaskId} onOpenChange={(open) => { if (!open) setRevertTaskId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revertir servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción sacará el servicio del historial y lo regresará al pipeline activo.
              Selecciona el estatus al que quieres revertir:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={revertStatus} onValueChange={(v) => setRevertStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVERT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={reverting}>
              {reverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Revertir servicio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Historial de Ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Servicios finalizados — registro histórico completo</p>
        </div>
        <Button size="sm" onClick={handleExport} disabled={completedTasks.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card bg-primary/5 border-primary/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full bg-primary/15 p-3">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recaudado</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full bg-slate-100 p-3">
              <Package className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Servicios</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{completedTasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full bg-slate-100 p-3">
              <TrendingUp className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Promedio</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                ${completedTasks.length > 0
                  ? (totalRevenue / completedTasks.length).toLocaleString("en-US", { minimumFractionDigits: 2 })
                  : "0.00"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 items-center bg-white p-3 rounded-md border shadow-sm flex-wrap">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, vendedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 w-[240px] bg-white"
          />
        </div>
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 gap-2 font-normal ${dateRange?.from ? "border-primary text-primary bg-primary/5" : "text-muted-foreground"}`}
            >
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              {dateRange?.from ? (
                dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
                  ? `${format(dateRange.from, "dd MMM", { locale: es })} – ${format(dateRange.to, "dd MMM", { locale: es })}`
                  : format(dateRange.from, "dd MMM yyyy", { locale: es })
              ) : "Filtrar por fecha"}
              {dateRange?.from && (
                <span onClick={e => { e.stopPropagation(); setDateRange(undefined); }} className="ml-1 rounded-full hover:bg-primary/20 p-0.5 cursor-pointer">
                  <X className="h-3 w-3" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={r => { setDateRange(r); if (r?.from && r?.to) setDatePickerOpen(false); }}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
        {(search || dateRange?.from) && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setDateRange(undefined); }}>
            Limpiar filtros
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{completedTasks.length} resultado{completedTasks.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Registro de Servicios Finalizados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[190px] font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Sucursal</TableHead>
                  <TableHead className="font-bold">Fecha Servicio</TableHead>
                  <TableHead className="font-bold">Servicios realizados</TableHead>
                  <TableHead className="font-bold text-right">Monto</TableHead>
                  <TableHead className="font-bold">Vendedor</TableHead>
                  {isAdmin && <TableHead className="font-bold w-[110px] text-center">Acción</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-muted-foreground">
                      {search || dateRange?.from
                        ? "No hay resultados para los filtros seleccionados"
                        : "No hay servicios finalizados aún"}
                    </TableCell>
                  </TableRow>
                ) : (
                  completedTasks.map(task => {
                    const emp = employees.find(e => e.id === task.assigned_to_user_id);
                    const dateStr = task.service_date || task.updated_at;
                    const serviceNames = task.services
                      ?.map(s => s.category?.name)
                      .filter(Boolean)
                      .join(", ") || "—";
                    return (
                      <TableRow key={task.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-semibold text-foreground">{task.client?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{task.client?.branch || "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {dateStr ? format(parseISO(dateStr), "dd MMM yyyy", { locale: es }) : "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px] truncate" title={serviceNames}>{serviceNames}</TableCell>
                        <TableCell className="text-right font-bold tabular-nums text-foreground">
                          ${task.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {emp?.full_name || emp?.email || <span className="italic">Sin asignar</span>}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1.5 text-xs"
                              onClick={() => { setRevertTaskId(task.id); setRevertStatus("Servicio en proceso"); }}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              Revertir
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
