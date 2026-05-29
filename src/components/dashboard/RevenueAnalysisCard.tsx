import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer,
} from "recharts";

interface RevenueItem {
  name: string;
  value: number;
}

interface Props {
  title: string;
  /** Pre-sorted desc by value is fine but not required; component sorts defensively. */
  data: RevenueItem[];
  topMetricLabel?: string; // e.g. "Top Servicio" / "Top Cliente"
}

const fmtMoney = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtAxis = (v: number) => {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${v}`;
};

// Color groups by rank: top 3 green, ranks 4-6 blue, 7-9 amber, rest gray.
const colorFor = (i: number) =>
  i < 3 ? "#16A34A" : i < 6 ? "#2563EB" : i < 9 ? "#F59E0B" : "#94A3B8";

export function RevenueAnalysisCard({ title, data, topMetricLabel = "Top" }: Props) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, d) => s + d.value, 0);
  const top = sorted[0];
  const top3Sum = sorted.slice(0, 3).reduce((s, d) => s + d.value, 0);
  const top3Pct = total > 0 ? (top3Sum / total) * 100 : 0;

  const chartData = sorted.map((d) => ({
    ...d,
    pct: total > 0 ? (d.value / total) * 100 : 0,
  }));

  return (
    <Card className="shadow-card border-none bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-800 font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-4">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Venta</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{fmtMoney(total)}</p>
          </div>
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-white p-4">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{topMetricLabel}</p>
            <p className="text-sm font-bold text-slate-900 truncate mt-1" title={top?.name}>
              {top?.name || "—"}
            </p>
            <p className="text-xs font-semibold text-slate-600 tabular-nums">{top ? fmtMoney(top.value) : "—"}</p>
          </div>
          <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-white p-4">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">% Top 3</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{top3Pct.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">de la venta total</p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36 + 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 70, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtAxis}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "#1e293b", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={170}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(_v: number, _n: string, item: any) => {
                  const d = item?.payload;
                  if (!d) return ["", ""];
                  return [`${fmtMoney(d.value)} · ${d.pct.toFixed(1)}%`, "Ingresos"];
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {chartData.map((_d, i) => (
                  <Cell key={i} fill={colorFor(i)} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => fmtMoney(v)}
                  fontSize={11}
                  className="font-bold fill-slate-700"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            Sin datos disponibles
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-4 pt-2 border-t text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#16A34A" }} /> Top 3</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#2563EB" }} /> Rango medio</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#F59E0B" }} /> Menores</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#94A3B8" }} /> Mínimos</span>
        </div>
      </CardContent>
    </Card>
  );
}
