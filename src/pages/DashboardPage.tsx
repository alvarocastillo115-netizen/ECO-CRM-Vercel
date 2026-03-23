import { useMemo } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ClipboardList, Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { Loader2 } from "lucide-react";

const CHART_COLORS = [
  "hsl(153, 83%, 30%)",
  "hsl(215, 55%, 24%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 60%, 50%)",
  "hsl(180, 60%, 40%)",
];

export default function DashboardPage() {
  const { tasks, categories, clients, loading } = useCrmData();

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Completed");
    const pipeline = tasks.filter((t) => t.status === "To-Do" || t.status === "In Progress");
    const active = tasks.filter((t) => t.status !== "Completed");

    const totalRevenue = completed.reduce((s, t) => s + Number(t.total_amount), 0);
    const pipelineValue = pipeline.reduce((s, t) => s + Number(t.total_amount), 0);

    // Revenue by category
    const revByCat: Record<string, number> = {};
    completed.forEach((t) => {
      t.services?.forEach((s) => {
        const catName = s.category?.name || "Otro";
        revByCat[catName] = (revByCat[catName] || 0) + Number(s.amount_allocated);
      });
    });
    const pieData = Object.entries(revByCat).map(([name, value]) => ({ name, value }));

    // Monthly trend
    const monthlyMap: Record<string, number> = {};
    completed.forEach((t) => {
      const month = format(startOfMonth(parseISO(t.created_at)), "yyyy-MM");
      monthlyMap[month] = (monthlyMap[month] || 0) + Number(t.total_amount);
    });
    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month: format(parseISO(month + "-01"), "MMM yy"), value }));

    // Top clients
    const clientSpend: Record<string, { name: string; total: number }> = {};
    completed.forEach((t) => {
      const cid = t.client_id;
      const cname = t.client?.name || "Desconocido";
      if (!clientSpend[cid]) clientSpend[cid] = { name: cname, total: 0 };
      clientSpend[cid].total += Number(t.total_amount);
    });
    const topClients = Object.values(clientSpend).sort((a, b) => b.total - a.total).slice(0, 5);

    return { totalRevenue, pipelineValue, activeCount: active.length, pieData, monthlyData, topClients };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Insights financieros y operativos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Ventas Cobradas</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                  ${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pipeline</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                  ${stats.pipelineValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Tareas Activas</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
                  {stats.activeCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ingresos por Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos de tareas completadas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="value" stroke="hsl(153, 83%, 30%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos de tendencia
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Top Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topClients.length > 0 ? (
            <div className="space-y-3">
              {stats.topClients.map((client, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{client.name}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    ${client.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sin datos de clientes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
