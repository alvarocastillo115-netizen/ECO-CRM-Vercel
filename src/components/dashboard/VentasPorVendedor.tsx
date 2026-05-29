import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Fixed palette per service, cycled by index of first appearance across vendors.
const PALETTE = ["#185FA5", "#3B6D11", "#BA7517", "#A32D2D", "#534AB7", "#0F6E56"];

const BADGE_BY_RANK: { label: string; bg: string; text: string }[] = [
  { label: "1er lugar", bg: "bg-emerald-100", text: "text-emerald-700" },
  { label: "2do lugar", bg: "bg-blue-100", text: "text-blue-700" },
  { label: "3er lugar", bg: "bg-amber-100", text: "text-amber-700" },
  { label: "4to lugar", bg: "bg-slate-100", text: "text-slate-600" },
];

export interface VendorData {
  name: string;
  data: Record<string, number>;
}

const fmtMoney = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const fmtAxis = (v: number) => {
  const n = Math.abs(v);
  if (n >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${v}`;
};

interface Props {
  vendors: VendorData[];
}

export function VentasPorVendedor({ vendors }: Props) {
  const { sorted, serviceColors, allServices, globalMax } = useMemo(() => {
    // Stable color assignment: services get colors in the order they first appear
    // across all vendors. So the palette stays consistent across panels even when
    // a vendor doesn't sell every service.
    const colors: Record<string, string> = {};
    const order: string[] = [];
    let max = 0;

    const withTotals = vendors.map((v) => {
      const entries = Object.entries(v.data).filter(([, val]) => val > 0);
      const total = entries.reduce((s, [, val]) => s + val, 0);
      for (const [name, val] of entries) {
        if (!(name in colors)) {
          colors[name] = PALETTE[order.length % PALETTE.length];
          order.push(name);
        }
        if (val > max) max = val;
      }
      return { ...v, entries, total };
    });

    withTotals.sort((a, b) => b.total - a.total);
    return {
      sorted: withTotals,
      serviceColors: colors,
      allServices: order,
      globalMax: max || 1,
    };
  }, [vendors]);

  if (sorted.length === 0) {
    return (
      <Card className="shadow-card border-none bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-800 font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" /> Ventas por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Sin datos de vendedores
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-none bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-800 font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" /> Ventas por Vendedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((vendor, idx) => {
            const badge = BADGE_BY_RANK[Math.min(idx, BADGE_BY_RANK.length - 1)];
            // Sort this vendor's services from highest to lowest.
            const ordered = [...vendor.entries].sort((a, b) => b[1] - a[1]);
            const labels = ordered.map(([n]) => n);
            const values = ordered.map(([, v]) => v);
            const bgColors = labels.map((n) => serviceColors[n] || "#94A3B8");

            const chartData = {
              labels,
              datasets: [
                {
                  data: values,
                  backgroundColor: bgColors,
                  borderRadius: 4,
                  borderSkipped: false,
                  maxBarThickness: 22,
                },
              ],
            };

            const options = {
              indexAxis: "y" as const,
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx: any) => {
                      const value = Number(ctx.parsed.x) || 0;
                      const pct = vendor.total > 0 ? (value / vendor.total) * 100 : 0;
                      return ` ${fmtMoney(value)} · ${pct.toFixed(1)}% del total`;
                    },
                    title: (items: any[]) => items[0]?.label || "",
                  },
                  backgroundColor: "#1e293b",
                  titleFont: { weight: "bold" as const },
                  padding: 10,
                  cornerRadius: 6,
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  max: globalMax,
                  grid: { color: "#e2e8f0", drawBorder: false },
                  ticks: {
                    color: "#64748b",
                    font: { size: 11, weight: 600 as const },
                    callback: (val: number | string) => fmtAxis(Number(val)),
                  },
                },
                y: {
                  grid: { display: false, drawBorder: false },
                  ticks: {
                    color: "#1e293b",
                    font: { size: 11, weight: 600 as const },
                  },
                },
              },
            };

            const canvasHeight = Math.max(values.length * 36 + 40, 120);

            return (
              <div key={vendor.name} className="border rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{vendor.name}</p>
                    <p className="text-xs text-slate-500 tabular-nums mt-0.5">{fmtMoney(vendor.total)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} uppercase tracking-wide`}>
                    {badge.label}
                  </span>
                </div>
                <div style={{ height: canvasHeight }}>
                  <Bar data={chartData} options={options} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Single global legend with all services across vendors. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t text-xs text-slate-600">
          {allServices.map((name) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: serviceColors[name] }} />
              <span className="font-medium">{name}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
