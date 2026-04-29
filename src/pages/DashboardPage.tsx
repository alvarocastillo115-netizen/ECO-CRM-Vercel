import { useMemo, useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, ClipboardList, Users, BarChart3, ArrowUp, ArrowDown, CalendarRange, X } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
  AreaChart, Area, LabelList
} from "recharts";
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, getDay, startOfDay, endOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { getTrendsData, getSalesBySellerData } from "@/lib/dashboard-utils";
import type { DateRange } from "react-day-picker";

const CHART_COLORS = [
  "#009999", // Teal/Cyan principal
  "#04427C", // Dark Blue
  "#7DCB56", // Light Green
  "#067E7E", // Darker Teal
  "#3A6E99", // Light/Muted Blue
  "#A6D98F", // Lighter Green
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

    const top5Services = serviceData.slice(0, 5);
    const bottom5Services = serviceData.length > 5
      ? serviceData.slice(-5).reverse()
      : serviceData.slice().reverse().slice(0, 5);

    // Pie chart data per filter
    const buildPieData = (filter: "total" | "closed" | "pipeline") => {
      const subset = filter === "total" ? tasks
        : filter === "closed" ? completed
        : pipeline;
      const catMap: Record<string, number> = {};
      subset.forEach((t) => {
        t.services?.forEach((s) => {
          const catName = s.category?.name || "Otro";
          catMap[catName] = (catMap[catName] || 0) + Number(s.amount_allocated);
        });
      });
      const total = Object.values(catMap).reduce((s, v) => s + v, 0);
      return Object.entries(catMap)
        .map(([name, value]) => ({
          name,
          value,
          pct: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.value - a.value);
    };

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
      serviceData, top5Services, bottom5Services,
      buildPieData, weeklyData, scheduledData, topClients, sellerData
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
  const pieClosed = stats.buildPieData("closed"); // NOTE: this still relies on "completed"
  const piePipeline = stats.buildPieData("pipeline");

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
        <KpiCard label="Ventas Pendientes" value={fmtMoney(stats.promisedValue)} icon={DollarSign} color="info" />
        <KpiCard label="Oportunidades" value={fmtMoney(stats.pipelineValue)} icon={TrendingUp} color="warning" />
        <KpiCard label="Tareas Activas" value={String(stats.activeCount)} icon={ClipboardList} color="primary" />
      </div>

      {/* Ventas por Servicio */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Ventas por Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.serviceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.serviceData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 13, fill: "#000", fontWeight: 700, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#000", fontWeight: 700, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={120} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: "inherit" }} />
                <Bar dataKey="value" radius={0}>
                  {stats.serviceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => fmtMoney(v)} fontSize={12} className="font-bold" fill="#000" style={{ fontFamily: "inherit" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>

      {/* Top/Bottom Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-emerald-600" /> Top 5 Servicios — Mayor Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankedList items={stats.top5Services} formatValue={fmtMoney} colorClass="text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-red-500" /> Bottom 5 Servicios — Menor Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankedList items={stats.bottom5Services} formatValue={fmtMoney} colorClass="text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* 2 Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieCard title="Venta Cerrada" data={pieClosed} fmtMoney={fmtMoney} />
        <PieCard title="Pipeline" data={piePipeline} fmtMoney={fmtMoney} />
      </div>

      {/* New Chart: Ventas por Vendedor y Servicio */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Ventas por Vendedor y Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.sellerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.sellerData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 13, fill: "#000", fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="seller" tick={{ fontSize: 13, fill: "#000", fontWeight: 700 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => <span style={{ color: '#000', fontWeight: 700 }}>{value}</span>} />
                {stats.serviceData.map((s, i) => (
                  <Bar key={s.name} dataKey={s.name} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>

      {/* Tendencia Semanal de Ventas (Refactored to Image 1 style) */}
      <Card className="shadow-card border-none bg-white">
        <CardHeader className="pb-2 border-b-0 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900">Tendencia de venta</CardTitle>
            <p className="text-sm text-slate-500 font-medium mt-1">Fechas: <span className="text-slate-800">{trendRange.label}</span></p>
          </div>
          <div className="w-40">
            <Select value={trendFilter} onValueChange={(v: "todo"|"mes"|"semana"|"dia") => setTrendFilter(v)}>
              <SelectTrigger className="h-8 text-xs">
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
              <LineChart data={stats.weeklyData.map(d => ({ ...d, week: d.date }))} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 13, fill: "#000", fontWeight: 700 }} axisLine={false} tickLine={false} tickMargin={12} />
                <YAxis tick={{ fontSize: 13, fill: "#000", fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip cursor={{ stroke: '#f0f0f0', strokeWidth: 1 }} contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ fill: CHART_COLORS[0], strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: CHART_COLORS[0], strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>



      {/* Top 10 Clientes */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Top Clientes — Mayor Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.topClients.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto overscroll-contain">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topClients.map((client, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <UITooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dashed border-primary/50">{client.name}</span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white p-3 shadow-lg border">
                          <p className="font-bold text-xs text-muted-foreground mb-2 uppercase tracking-tight">Servicios de {client.name}</p>
                          <div className="space-y-1">
                            {Object.entries(client.services)
                               .sort((a,b) => b[1] - a[1])
                               .map(([sname, amount]) => (
                               <div key={sname} className="flex justify-between items-center gap-4 text-sm">
                                 <span>{sname}</span>
                                 <span className="font-semibold">{fmtMoney(amount)}</span>
                               </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(client.total)}</TableCell>
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

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card className="shadow-card">
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
      </CardContent>
    </Card>
  );
}

function RankedList({ items, formatValue, colorClass }: { items: { name: string; value: number }[]; formatValue: (v: number) => string; colorClass: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${colorClass} w-5`}>{i + 1}</span>
            <span className="text-sm font-medium">{item.name}</span>
          </div>
          <span className="text-sm font-semibold tabular-nums">{formatValue(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
      Sin datos disponibles
    </div>
  );
}

function PieCard({ title, data, fmtMoney }: { title: string; data: { name: string; value: number; pct: number }[]; fmtMoney: (v: number) => string }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtMoney(v)} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                iconType="square"
                wrapperStyle={{ fontSize: '13px', color: '#000', fontWeight: 600, paddingLeft: '20px' }}
                formatter={(value, entry: any) => <span style={{ color: '#000' }}>{value} ({entry.payload.pct}%)</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </CardContent>
    </Card>
  );
}
