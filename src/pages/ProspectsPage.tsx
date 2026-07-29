import { useState, useMemo } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Users, ArrowRightLeft, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { TaskStatus } from "@/types/crm";
import { toast } from "@/hooks/use-toast";
import { isProspect, daysSinceCreated, PROSPECT_THRESHOLD_DAYS } from "@/lib/prospects";

export default function ProspectsPage() {
  const { tasks, employees, loading, updateTaskStatus } = useCrmData();
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = useState("");

  // Estado del diálogo de reactivación
  const [reactivateId, setReactivateId] = useState<string | null>(null);
  const [reactivateStatus, setReactivateStatus] = useState<TaskStatus>("Inspeccion");
  const [reactivating, setReactivating] = useState(false);

  // Opciones a las que se puede reactivar un prospecto (etapas posteriores).
  // No se incluye "Primer contacto" a propósito (el prospecto seguiría siendo viejo).
  const REACTIVATE_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: "Inspeccion", label: "Inspección" },
    { value: "Cotizacion", label: "Cotización" },
    { value: "Servicio Agendado", label: "Servicio Agendado" },
    { value: "Servicio en proceso", label: "Servicio en Proceso" },
  ];

  const prospects = useMemo(() => {
    return tasks
      .filter((t) => isProspect(t))
      // Los empleados solo ven sus propios prospectos; los admin ven todo.
      .filter((t) => isAdmin || t.assigned_to_user_id === user?.id)
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.client?.name?.toLowerCase().includes(q) ||
          t.client?.branch?.toLowerCase().includes(q) ||
          t.client?.phone?.toLowerCase().includes(q) ||
          employees.find((e) => e.id === t.assigned_to_user_id)?.full_name?.toLowerCase().includes(q)
        );
      })
      // Más antiguos primero (los que más llevan esperando arriba).
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [tasks, employees, search, isAdmin, user]);

  const handleReactivate = async () => {
    if (!reactivateId) return;
    setReactivating(true);
    const { error } = await updateTaskStatus(reactivateId, reactivateStatus);
    setReactivating(false);
    setReactivateId(null);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Prospecto reactivado", description: `Movido a "${reactivateStatus}".` });
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Diálogo de reactivación */}
      <AlertDialog open={!!reactivateId} onOpenChange={(open) => { if (!open) setReactivateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reactivar prospecto?</AlertDialogTitle>
            <AlertDialogDescription>
              El prospecto saldrá de la Base de Prospectos y regresará al pipeline activo.
              Selecciona la etapa a la que quieres moverlo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={reactivateStatus} onValueChange={(v) => setReactivateStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REACTIVATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={reactivating}>
              {reactivating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Base de Prospectos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clientes en "Primer contacto" con {PROSPECT_THRESHOLD_DAYS} días o más sin avanzar
          </p>
        </div>
      </div>

      {/* Tarjeta resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-card bg-primary/5 border-primary/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-full bg-primary/15 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prospectos</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{prospects.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de filtro */}
      <div className="flex gap-3 items-center bg-white p-3 rounded-md border shadow-sm flex-wrap">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, sucursal, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 w-[260px] bg-white"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {prospects.length} resultado{prospects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabla */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Prospectos sin avanzar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[200px] font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Sucursal</TableHead>
                  <TableHead className="font-bold">Teléfono</TableHead>
                  <TableHead className="font-bold text-center">Días esperando</TableHead>
                  <TableHead className="font-bold">Creado</TableHead>
                  <TableHead className="font-bold">Vendedor</TableHead>
                  <TableHead className="font-bold text-center w-[120px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {search ? "No hay prospectos que coincidan con la búsqueda" : "No hay prospectos por ahora"}
                    </TableCell>
                  </TableRow>
                ) : (
                  prospects.map((task) => {
                    const emp = employees.find((e) => e.id === task.assigned_to_user_id);
                    const days = daysSinceCreated(task);
                    return (
                      <TableRow key={task.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          {task.client?.name || "—"}
                          {task.client?.is_fixed && (
                            <span className="ml-2 text-[10px] text-orange-600 bg-orange-100 px-1 py-0.5 rounded font-bold">★ FIJO</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{task.client?.branch || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{task.client?.phone || "—"}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 tabular-nums">
                            <Clock className="h-3 w-3" />
                            {days} días
                          </span>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {format(parseISO(task.created_at), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {emp?.full_name || emp?.email || <span className="italic">Sin asignar</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5 text-xs"
                            onClick={() => { setReactivateId(task.id); setReactivateStatus("Inspeccion"); }}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Reactivar
                          </Button>
                        </TableCell>
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
