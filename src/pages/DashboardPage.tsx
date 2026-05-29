import { useMemo, useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, ClipboardList, Users, CalendarRange, X, Info } from "lucide-react";
import {
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
  AreaChart, Area,
} from "recharts";
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { getSalesBySellerData } from "@/lib/dashboard-utils";
import { VentasPorVendedor, type VendorData } from "@/components/dashboard/VentasPorVendedor";
import { RevenueAnalysisCard } from "@/components/dashboard/RevenueAnalysisCard";
import type { DateRange } from "react-day-picker";

const CHART_COLORS = [
  "#72B5E8", // Sky Blue (matching Image 1)
  "#477EAE", // Slate/Steel Blue
  "#A4E28A", // Light Green
  "#4A9C39", // Forest Green
  "#74C455", // Lime Green
  "#FED788", // Pale Yellow
  "#DF5129", // Red-Orange
  "#FA913B", // Vibrant Orange
];



export default function DashboardPage() {
  const { tasks, employees, loading } = useCrmData();
  const [trendFilter, setTrendFilter] = useState<'todo' | 'mes' | 'semana' | 'dia'>('todo');
  const [schedFilter, setSchedFilter] = useState<'mes' | 'semana' | 'dia'>('semana');
  const [globalDateRange, setGlobalDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const globalRangeActive = !!globalDateRange?.from;

  const getRange = (filter: 'todo' | 'mes' | 'semana' | 'dia') => {
    const now = new Date();
    if (filter === 'todo') {
      return { start: new Date(2000, 0, 1), end: now, label: "Histórico Acumulado" };
    }
    if (filter === 'mes') {
      return { start: startOfMonth(now), end: endOfMonth(now), label: `${format(startOfMonth(now), "dd MMM")} - ${format(endOfMonth(now), "dd MMM")}` };
    }
    if (filter === 'semana') {
      const s = startOfWeek(now, { weekStartsOn: 1 });
      const e = endOfWeek(now, { weekStartsOn: 1 });
      return { start: s, end: e, label: `${format(s, "dd MMM")} - ${format(e, "dd MMM")}` };
    }
    return { start: now, end: now, label: format(now, "dd MMM, yyyy") };
  };

  const trendRange = useMemo(() => getRange(trendFilter), [trendFilter]);
  const schedRange = useMemo(() => getRange(schedFilter), [schedFilter]);

  const stats = useMemo(() => {
    // Apply global date range: filter completed by service_date or updated_at
    const applyGlobal = (list: typeof tasks) => {
      if (!globalDateRange?.from) return list;
      const from = startOfDay(globalDateRange.from);
      const to = globalDateRange.to ? endOfDay(globalDateRange.to) : endOfDay(globalDateRange.from);
      return list.filter(t => {
        const ds = t.sale_closed_at || t.service_date || t.updated_at;
        try { return isWithinInterval(parseISO(ds), { start: from, end: to }); }
        catch { return false; }
      });
    };

    const completed = applyGlobal(tasks.filter((t) => t.status === "Servicio completado"));
    const promised = applyGlobal(tasks.filter((t) => ["Servicio Agendado", "Servicio en proceso"].includes(t.status)));
    const pipeline = tasks.filter((t) => ["Primer contacto", "Inspeccion", "Cotizacion"].includes(t.status));
    const active = tasks.filter((t) => t.status !== "Servicio completado");

    const totalRevenue = completed.reduce((s, t) => s + Number(t.total_amount), 0);
    const promisedValue = promised.reduce((s, t) => s + Number(t.total_amount), 0);
    const pipelineValue = pipeline.reduce((s, t) => s + Number(t.total_amount), 0);

    // Per-status breakdowns powering the KPI tooltips.
    const breakdownFor = (subset: typeof tasks, statuses: string[]) =>
      statuses.map((status) => ({
        status,
        total: subset
          .filter((t) => t.status === status)
          .reduce((s, t) => s + Number(t.total_amount), 0),
      }));
    const promisedBreakdown = breakdownFor(promised, ["Servicio Agendado", "Servicio en proceso"]);
    const pipelineBreakdown = breakdownFor(pipeline, ["Primer contacto", "Inspeccion", "Cotizacion"]);

    // Revenue by service category (completed)
    const revByCat: Record<string, number> = {};
    completed.forEach((t) => {
      t.services?.forEach((s) => {
        const catName = s.category?.name || "Otro";
        revByCat[catName] = (revByCat[catName] || 0) + Number(s.amount_allocated);
      });
    });
    const serviceData = Object.entries(revByCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Filtered tasks for Tendencia de Venta (includes both completed and promised)
    const dateFilteredTrends = [...completed, ...promised].filter(t => {
      const d = parseISO(t.sale_closed_at || t.created_at);
      // for "mes" we include the whole month, etc.
      return d >= trendRange.start && d <= trendRange.end;
    });

    const weeklyMap: Record<string, number> = {};
    dateFilteredTrends.forEach((t) => {
      const baseDate = t.sale_closed_at || t.created_at;
      let dateKey = baseDate;
      if (trendFilter === 'mes') {
         // Show monthly trend
         dateKey = format(parseISO(baseDate), "yyyy-MM");
      } else if (trendFilter === 'semana') {
         // Show weekly trend
         dateKey = format(startOfWeek(parseISO(baseDate), { weekStartsOn: 1 }), "yyyy-MM-dd");
      } else {
         // dia -> Show daily trend
         dateKey = format(parseISO(baseDate), "yyyy-MM-dd");
      }
      weeklyMap[dateKey] = (weeklyMap[dateKey] || 0) + Number(t.total_amount);
    });

    const weeklyData = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date: trendFilter === 'mes' ? format(parseISO(date + "-01"), "MMM yy", { locale: es }) : format(parseISO(date), "dd MMM", { locale: es }),
        value,
      }));

    const sellerData = getSalesBySellerData([...completed, ...promised], employees);

    // Tendencia Semanal de Servicios Agendados -> filter and group by MONDAY to SUNDAY
    const dateFilteredSched = tasks.filter(t => {
      if (!t.service_date) return false;
      const d = parseISO(t.service_date);
      // For the scheduled filter, if they select "mes", we still map it to Lunes-Domingo by extracting weekday.
      // E.g. total services scheduled on Mondays in the given month.
      return d >= schedRange.start && d <= schedRange.end;
    });

    const weekdayMap: Record<string, number> = {
      "Lunes": 0, "Martes": 0, "Miércoles": 0, "Jueves": 0, "Viernes": 0, "Sábado": 0, "Domingo": 0
    };
    const jsDayToName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    
    dateFilteredSched.forEach((t) => {
      const count = t.services?.length || 1;
      const dayName = jsDayToName[getDay(parseISO(t.service_date || t.created_at))];
      if (weekdayMap[dayName] !== undefined) {
         weekdayMap[dayName] += count;
      }
    });

    const scheduledData = [
      { day: "Lunes", count: weekdayMap["Lunes"] },
      { day: "Martes", count: weekdayMap["Martes"] },
      { day: "Miércoles", count: weekdayMap["Miércoles"] },
      { day: "Jueves", count: weekdayMap["Jueves"] },
      { day: "Viernes", count: weekdayMap["Viernes"] },
      { day: "Sábado", count: weekdayMap["Sábado"] },
      { day: "Domingo", count: weekdayMap["Domingo"] },
    ];

    // Top 10 clients
    const clientSpend: Record<string, { name: string; total: number; services: Record<string, number> }> = {};
    completed.forEach((t) => {
      const cid = t.client_id;
      const cname = t.client?.name || "Desconocido";
      if (!clientSpend[cid]) clientSpend[cid] = { name: cname, total: 0, services: {} };
      clientSpend[cid].total += Number(t.total_amount);
      t.services?.forEach(s => {
        const sname = s.category?.name || "Otro";
        clientSpend[cid].services[sname] = (clientSpend[cid].services[sname] || 0) + Number(s.amount_allocated);
      });
    });
    const topClients = Object.values(clientSpend).sort((a, b) => b.total - a.total);

    return {
      totalRevenue, promisedValue, pipelineValue, activeCount: active.length,
      promisedBreakdown, pipelineBreakdown,
      serviceData,
      weeklyData, scheduledData, topClients, sellerData
    };
  }, [tasks, employees, trendFilter, trendRange, schedRange, globalDateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fmtMoney = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  // sellerData is `{ seller, [serviceName]: amount }[]` — shape it for VentasPorVendedor.
  const vendorsForChart: VendorData[] = stats.sellerData.map((row: any) => {
    const { seller, ...services } = row;
    return { name: seller, data: services as Record<string, number> };
  });

  // topClients is already aggregated revenue per client (completed only).
  const clientRevenueData = stats.topClients.map((c) => ({ name: c.name, value: c.total }));

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Insights financieros y operativos</p>
        </div>
        {/* Global Date Range Filter */}
        <div className="flex items-center gap-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-2 font-normal ${
                  globalRangeActive ? "border-primary text-primary bg-primary/5" : "text-muted-foreground"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                {globalDateRange?.from ? (
                  globalDateRange.to && globalDateRange.to.getTime() !== globalDateRange.from.getTime()
                    ? `${format(globalDateRange.from, "dd MMM", { locale: es })} – ${format(globalDateRange.to, "dd MMM", { locale: es })}`
                    : format(globalDateRange.from, "dd MMM yyyy", { locale: es })
                ) : "Filtrar por fecha"}
                {globalRangeActive && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setGlobalDateRange(undefined); }}
                    className="ml-1 rounded-full hover:bg-primary/20 p-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={globalDateRange?.from}
                selected={globalDateRange}
                onSelect={(r) => {
                  setGlobalDateRange(r);
                  if (r?.from && r?.to) setDatePickerOpen(false);
                }}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Ventas Cobradas" value={fmtMoney(stats.totalRevenue)} icon={DollarSign} color="primary" />
        <KpiCard
          label="Ventas Pendientes"
          value={fmtMoney(stats.promisedValue)}
          icon={DollarSign}
          color="info"
          breakdown={stats.promisedBreakdown}
          fmtMoney={fmtMoney}
        />
        <KpiCard
          label="Oportunidades"
          value={fmtMoney(stats.pipelineValue)}
          icon={TrendingUp}
          color="warning"
          breakdown={stats.pipelineBreakdown}
          fmtMoney={fmtMoney}
        />
        <KpiCard label="Tareas Activas" value={String(stats.activeCount)} icon={ClipboardList} color="primary" />
      </div>

      <RevenueAnalysisCard
        title="Análisis de Ingresos por Servicio"
        data={stats.serviceData}
        topMetricLabel="Top Servicio"
      />

      <RevenueAnalysisCard
        title="Análisis de Ingresos por Cliente"
        data={clientRevenueData}
        topMetricLabel="Top Cliente"
      />

      {/* Small-multiples Ventas por Vendedor */}
      <VentasPorVendedor vendors={vendorsForChart} />

      {/* Tendencia Semanal de Ventas (Refactored to Image 1 style) */}
      <Card className="shadow-card border-none bg-white">
        <CardHeader className="pb-2 border-b-0 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">Tendencia de venta</CardTitle>
            <p className="text-xs text-slate-500 font-medium mt-1">Fechas: <span className="text-slate-800 font-semibold">{trendRange.label}</span></p>
          </div>
          <div className="w-40">
            <Select value={trendFilter} onValueChange={(v: "todo"|"mes"|"semana"|"dia") => setTrendFilter(v)}>
              <SelectTrigger className="h-8 text-xs border-slate-200">
                <SelectValue placeholder="Filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mensual</SelectItem>
                <SelectItem value="semana">Semanal</SelectItem>
                <SelectItem value="dia">Diaria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {stats.weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={stats.weeklyData.map(d => ({ ...d, week: d.date }))} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#009999" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#009999" stopOpacity={0.00}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={8} 
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                />
                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} formatter={(v: number) => fmtMoney(v)} />
                <Area type="monotone" dataKey="value" stroke="#009999" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" dot={{ fill: "#009999", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: "#009999", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>



      {/* Top 10 Clientes */}
      <Card className="shadow-card border-none bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-800 font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" /> Top Clientes — Mayor Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.topClients.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto overscroll-contain rounded-md border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-slate-500 font-bold text-xs uppercase w-16 px-4 py-3">Rank</TableHead>
                    <TableHead className="text-slate-500 font-bold text-xs uppercase px-4 py-3">Cliente</TableHead>
                    <TableHead className="text-right text-slate-500 font-bold text-xs uppercase px-4 py-3">Total Venta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topClients.map((client, i) => (
                    <TableRow key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-4 py-3">
                        <span className="text-slate-400 font-bold text-xs">{String(i + 1).padStart(2, '0')}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-semibold text-slate-700">
                        <UITooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <span className="cursor-help border-b border-dashed border-slate-300 hover:border-slate-500 pb-0.5 transition-colors">{client.name}</span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white p-3 shadow-lg border border-slate-200 rounded-md">
                            <p className="font-bold text-[10px] text-slate-400 mb-2 uppercase tracking-wider">Desglose de Servicios</p>
                            <div className="space-y-1.5">
                              {Object.entries(client.services)
                                 .sort((a,b) => b[1] - a[1])
                                 .map(([sname, amount]) => (
                                 <div key={sname} className="flex justify-between items-center gap-4 text-xs">
                                   <span className="text-slate-600 font-medium">{sname}</span>
                                   <span className="font-bold text-slate-800">{fmtMoney(amount)}</span>
                                 </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </UITooltip>
                      </TableCell>
                      <TableCell className="text-right px-4 py-3 font-bold text-slate-800 tabular-nums">{fmtMoney(client.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de clientes</p>
          )}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  breakdown,
  fmtMoney,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  breakdown?: { status: string; total: number }[];
  fmtMoney?: (v: number) => string;
}) {
  return (
    <Card className="shadow-card relative">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
        </div>
        {breakdown && breakdown.length > 0 && (
          <UITooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Desglose por estatus"
                className="absolute bottom-2 left-2 text-amber-500 hover:text-amber-600 transition-colors"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className="p-0 max-w-xs">
              <div className="p-3 space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Estatus incluidos
                </div>
                <div className="space-y-1.5">
                  {breakdown.map((b) => (
                    <div key={b.status} className="flex items-center justify-between gap-4 text-xs">
                      <span className="font-medium">{b.status}</span>
                      <span className="font-semibold tabular-nums">{fmtMoney ? fmtMoney(b.total) : `$${b.total.toFixed(2)}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </UITooltip>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
      Sin datos disponibles
    </div>
  );
}
