import { useMemo, useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, ClipboardList, Users, BarChart3, ArrowUp, ArrowDown, CalendarClock } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
} from "recharts";
import { format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const CHART_COLORS = [
  "hsl(153, 83%, 30%)", "hsl(215, 55%, 24%)", "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)", "hsl(270, 60%, 50%)", "hsl(180, 60%, 40%)",
  "hsl(330, 60%, 50%)", "hsl(90, 60%, 40%)", "hsl(200, 70%, 50%)",
  "hsl(15, 80%, 55%)",
];



export default function DashboardPage() {
  const { tasks, loading } = useCrmData();
  const [pieFilter, setPieFilter] = useState<PieFilter>("closed");

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Completed");
    const pipeline = tasks.filter((t) => t.status === "To-Do" || t.status === "In Progress");
    const active = tasks.filter((t) => t.status !== "Completed");

    const totalRevenue = completed.reduce((s, t) => s + Number(t.total_amount), 0);
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
    const buildPieData = (filter: PieFilter) => {
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

    // Weekly trend (completed, by created_at)
    const weeklyMap: Record<string, number> = {};
    completed.forEach((t) => {
      const weekStart = format(startOfWeek(parseISO(t.created_at), { weekStartsOn: 1 }), "yyyy-MM-dd");
      weeklyMap[weekStart] = (weeklyMap[weekStart] || 0) + Number(t.total_amount);
    });
    const weeklyData = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, value]) => ({
        week: format(parseISO(week), "dd MMM", { locale: es }),
        value,
      }));

    // Weekly scheduled trend (by scheduled_date)
    const scheduledMap: Record<string, number> = {};
    tasks.forEach((t) => {
      if (!t.scheduled_date) return;
      const weekStart = format(startOfWeek(parseISO(t.scheduled_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      // Count services scheduled
      const count = t.services?.length || 1;
      scheduledMap[weekStart] = (scheduledMap[weekStart] || 0) + count;
    });
    const scheduledData = Object.entries(scheduledMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, count]) => ({
        week: format(parseISO(week), "dd MMM", { locale: es }),
        count,
      }));

    // Top 10 clients
    const clientSpend: Record<string, { name: string; total: number }> = {};
    completed.forEach((t) => {
      const cid = t.client_id;
      const cname = t.client?.name || "Desconocido";
      if (!clientSpend[cid]) clientSpend[cid] = { name: cname, total: 0 };
      clientSpend[cid].total += Number(t.total_amount);
    });
    const topClients = Object.values(clientSpend).sort((a, b) => b.total - a.total).slice(0, 10);

    return {
      totalRevenue, pipelineValue, activeCount: active.length,
      serviceData, top5Services, bottom5Services,
      buildPieData, weeklyData, scheduledData, topClients,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fmtMoney = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const pieData = stats.buildPieData(pieFilter);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Insights financieros y operativos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Ventas Cobradas" value={fmtMoney(stats.totalRevenue)} icon={DollarSign} color="primary" />
        <KpiCard label="Pipeline" value={fmtMoney(stats.pipelineValue)} icon={TrendingUp} color="info" />
        <KpiCard label="Tareas Activas" value={String(stats.activeCount)} icon={ClipboardList} color="warning" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="value" fill="hsl(153, 83%, 30%)" radius={[0, 4, 4, 0]} />
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

      {/* Pie Chart with Filter */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Participación Porcentual por Servicio</CardTitle>
            <Select value={pieFilter} onValueChange={(v) => setPieFilter(v as PieFilter)}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Venta Total</SelectItem>
                <SelectItem value="closed">Venta Cerrada</SelectItem>
                <SelectItem value="pipeline">Pipeline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  dataKey="value"
                  label={({ name, pct }) => `${name} ${pct}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>

      {/* Tendencia Semanal de Ventas */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendencia Semanal de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Line type="monotone" dataKey="value" stroke="hsl(215, 55%, 24%)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>

      {/* Tendencia Semanal de Servicios Agendados */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Tendencia Semanal de Servicios Agendados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.scheduledData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.scheduledData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => `${v} servicios`} />
                <Bar dataKey="count" fill="hsl(270, 60%, 50%)" radius={[4, 4, 0, 0]} name="Servicios agendados" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </CardContent>
      </Card>

      {/* Top 10 Clientes */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Top 10 Clientes — Mayor Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.topClients.length > 0 ? (
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
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(client.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de clientes</p>
          )}
        </CardContent>
      </Card>
    </div>
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
