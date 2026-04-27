import { useMemo, useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";

export default function CommissionsPage() {
  const { tasks, employees, loading } = useCrmData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync date range with URL
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [date, setDate] = useState<DateRange | undefined>({
    from: fromParam ? new Date(fromParam) : startOfMonth(new Date()),
    to: toParam ? new Date(toParam) : endOfMonth(new Date()),
  });

  const commissionsBySeller = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Servicio completado");
    
    // Filter by date first
    const filteredTasks = completed.filter((t) => {
      if (!date?.from || !date?.to) return true;
      const taskDate = parseISO(t.created_at);
      return isWithinInterval(taskDate, { start: date.from, end: date.to });
    });

    const sellerMap: Record<string, { sellerName: string; totalAmount: number; tasksCount: number; servicesCount: number; services: Record<string, number> }> = {};

    filteredTasks.forEach(t => {
      const sellerId = t.assigned_to_user_id || "unassigned";
      const sellerName = employees.find(e => e.id === sellerId)?.full_name || "Sin Asignar";

      if (!sellerMap[sellerId]) {
         sellerMap[sellerId] = { sellerName, totalAmount: 0, tasksCount: 0, servicesCount: 0, services: {} };
      }

      sellerMap[sellerId].totalAmount += Number(t.total_amount);
      sellerMap[sellerId].tasksCount += 1;
      sellerMap[sellerId].servicesCount += t.services?.length || 0;

      t.services?.forEach(s => {
        const sname = s.category?.name || "Otros";
        sellerMap[sellerId].services[sname] = (sellerMap[sellerId].services[sname] || 0) + Number(s.amount_allocated);
      });
    });

    return Object.values(sellerMap).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [tasks, employees, date]);

  const totalSales = commissionsBySeller.reduce((sum, c) => sum + c.totalAmount, 0);

  const updateURL = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from) searchParams.set("from", range.from.toISOString());
    else searchParams.delete("from");
    if (range?.to) searchParams.set("to", range.to.toISOString());
    else searchParams.delete("to");
    setSearchParams(searchParams);
  };

  const setRange = (type: 'last15' | 'lastMonth' | 'currentMonth') => {
    let from = new Date();
    let to = new Date();
    if (type === 'last15') {
       from = subDays(new Date(), 15);
    } else if (type === 'lastMonth') {
       const lastMonth = subDays(startOfMonth(new Date()), 1);
       from = startOfMonth(lastMonth);
       to = endOfMonth(lastMonth);
    } else if (type === 'currentMonth') {
       from = startOfMonth(new Date());
       to = endOfMonth(new Date());
    }
    updateURL({ from, to });
  };

  const fmtMoney = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const handleExport = () => {
    // Collect all unique category names (rows)
    const allCategories = Array.from(
      new Set(commissionsBySeller.flatMap((c) => Object.keys(c.services)))
    ).sort();

    // Sellers as columns
    const sellers = commissionsBySeller;

    // Header row: ["Servicio", Seller1, Seller2, ..., "TOTAL"]
    const headers = [
      "Servicio",
      ...sellers.map((s) => s.sellerName),
      "TOTAL",
    ];

    // One row per category
    const categoryRows = allCategories.map((cat) => {
      const rowTotal = sellers.reduce((s, c) => s + (c.services[cat] || 0), 0);
      return [
        cat,
        ...sellers.map((c) => parseFloat((c.services[cat] || 0).toFixed(2))),
        parseFloat(rowTotal.toFixed(2)),
      ];
    });

    // Summary rows at the bottom
    const totalRow = [
      "TOTAL VENDIDO ($)",
      ...sellers.map((c) => parseFloat(c.totalAmount.toFixed(2))),
      parseFloat(sellers.reduce((s, c) => s + c.totalAmount, 0).toFixed(2)),
    ];

    const countRow = [
      "# Servicios",
      ...sellers.map((c) => c.servicesCount),
      sellers.reduce((s, c) => s + c.servicesCount, 0),
    ];

    const wsData = [headers, ...categoryRows, totalRow, countRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 26 }, // Nombre del servicio
      ...sellers.map(() => ({ wch: 18 })),
      { wch: 18 }, // TOTAL column
    ];

    const today = format(new Date(), "dd-MM-yyyy");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
    XLSX.writeFile(wb, `Comisiones ${today}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Cálculo de Comisiones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Reporte detallado de ventas por vendedor</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setRange('last15')}>Última quincena</Button>
          <Button variant="outline" size="sm" onClick={() => setRange('lastMonth')}>Mes pasado</Button>
          <Button variant="outline" size="sm" onClick={() => setRange('currentMonth')}>Este mes</Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Seleccionar rango</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={updateURL}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
          
          <Button size="sm" onClick={handleExport} disabled={commissionsBySeller.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1 shadow-card bg-primary/5 border-primary/10">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Ventas Totales</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{fmtMoney(totalSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">{commissionsBySeller.length} vendedores</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-card overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" /> Ventas por Vendedor
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 flex items-center px-4 py-3 gap-4 border-none">
                    <TableHead className="font-bold flex-1 text-left p-0 h-auto text-slate-700">Vendedor</TableHead>
                    <TableHead className="font-bold w-[130px] text-center p-0 h-auto text-slate-700">Servicios</TableHead>
                    <TableHead className="font-bold w-[130px] text-center p-0 h-auto text-slate-700">Ticket Promedio</TableHead>
                    <TableHead className="font-bold w-[130px] text-right p-0 h-auto text-slate-700">Total Vendido</TableHead>
                    <div className="w-4 shrink-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionsBySeller.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No hay ventas registradas en este periodo
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow className="hover:bg-transparent p-0 border-none m-0">
                      <TableCell colSpan={4} className="p-0 border-none m-0 block">
                        <Accordion type="single" collapsible className="w-full">
                          {commissionsBySeller.map((c, i) => (
                            <AccordionItem value={`item-${i}`} key={i} className="border-b">
                              <AccordionTrigger className="w-full hover:no-underline hover:bg-muted/30 py-3 px-4 flex items-center gap-4">
                                <div className="flex-1 text-left font-semibold text-slate-800">
                                  {c.sellerName}
                                </div>
                                <div className="text-sm font-medium text-slate-500 w-[130px] text-center">
                                  {c.servicesCount}
                                </div>
                                <div className="text-sm font-medium text-slate-500 w-[130px] text-center">
                                  {fmtMoney(c.totalAmount / (c.tasksCount || 1))}
                                </div>
                                <div className="font-black text-slate-900 tabular-nums w-[130px] text-right">
                                  {fmtMoney(c.totalAmount)}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="bg-slate-50 border-t px-4 py-3">
                                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Desglose por Servicio</p>
                                <div className="space-y-2">
                                  {Object.entries(c.services)
                                    .sort((a,b) => b[1] - a[1])
                                    .map(([sname, v]) => (
                                      <div key={sname} className="flex justify-between text-sm">
                                        <span className="text-slate-700 font-medium">{sname}</span>
                                        <span className="text-slate-900 font-bold tabular-nums">{fmtMoney(v)}</span>
                                      </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
