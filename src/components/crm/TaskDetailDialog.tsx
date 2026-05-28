import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import type { CrmTask, Category, Profile, TaskStatus } from "@/types/crm";
import { STATUS_COLUMNS } from "@/types/crm";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { findScheduleConflict, buildTimeString } from "@/lib/schedule-conflicts";
import { useAuth } from "@/hooks/useAuth";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: CrmTask | null;
  categories: Category[];
  employees: Profile[];
  tasks?: CrmTask[];
  onUpdateTask: (taskId: string, data: any) => Promise<{ error: string | null }>;
  onUpdateStatus: (taskId: string, status: TaskStatus, keepAnEyeData?: any) => Promise<{ error: string | null }>;
  onDeleteTask?: (taskId: string) => Promise<{ error: string | null }>;
  readOnly?: boolean;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  categories,
  employees,
  tasks = [],
  onUpdateTask,
  onUpdateStatus,
  onDeleteTask,
  readOnly = false,
}: TaskDetailDialogProps) {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<TaskStatus>("Primer contacto");
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [specifications, setSpecifications] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionTimeStart, setInspectionTimeStart] = useState("");
  const [inspectionTimeEnd, setInspectionTimeEnd] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTimeStart, setServiceTimeStart] = useState("");
  const [serviceTimeEnd, setServiceTimeEnd] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status as TaskStatus);
      
      setSpecifications(task.specifications);
      setInspectionDate(task.inspection_date || "");
      
      const inspParts = (task.inspection_time || "").split(" - ");
      setInspectionTimeStart(inspParts[0] || "");
      setInspectionTimeEnd(inspParts[1] || "");

      setServiceDate(task.service_date || "");
      
      const servParts = (task.service_time || "").split(" - ");
      setServiceTimeStart(servParts[0] || "");
      setServiceTimeEnd(servParts[1] || "");
      setAssignedTo(task.assigned_to_user_id || "");
      const svcMap: Record<string, number> = {};
      task.services?.forEach((s) => {
        svcMap[s.category_id] = Number(s.amount_allocated);
      });
      setSelectedServices(svcMap);
    }
  }, [task]);

  const total = useMemo(
    () => Object.values(selectedServices).reduce((s, v) => s + (v || 0), 0),
    [selectedServices]
  );

  const toggleCategory = (catId: string) => {
    setSelectedServices((prev) => {
      const copy = { ...prev };
      if (catId in copy) delete copy[catId];
      else copy[catId] = 0;
      return copy;
    });
  };

  const handleSave = async (overrideStatus?: TaskStatus) => {
    if (!task) return;

    const inspectionTimeStr = buildTimeString(inspectionTimeStart, inspectionTimeEnd);
    const serviceTimeStr = buildTimeString(serviceTimeStart, serviceTimeEnd);

    // Block save when the proposed slot overlaps another task on the same date.
    // Exclude the current task so simply re-saving the same data doesn't trip it.
    const inspectionConflict = inspectionDate
      ? findScheduleConflict({ date: inspectionDate, time: inspectionTimeStr }, tasks, task.id)
      : null;
    const serviceConflict = serviceDate
      ? findScheduleConflict({ date: serviceDate, time: serviceTimeStr }, tasks, task.id)
      : null;
    if (inspectionConflict || serviceConflict) {
      toast({
        title: "Fecha y hora ocupadas",
        description: "Por favor selecciona una nueva hora o una nueva fecha.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const updateData: any = {
      specifications,
      inspection_date: inspectionDate || null,
      inspection_time: inspectionTimeStr,
      service_date: serviceDate || null,
      service_time: serviceTimeStr,
      assigned_to_user_id: assignedTo || null,
      status: typeof overrideStatus === "string" ? overrideStatus : status,
      services: Object.entries(selectedServices).map(([category_id, amount_allocated]) => ({
        category_id,
        amount_allocated,
      })),
    };

    const { error } = await onUpdateTask(task.id, updateData);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Tarea actualizada" });
      onOpenChange(false);
    }
    setSaving(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {task.client?.name || "Tarea"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Creada {format(new Date(task.created_at), "dd/MM/yyyy")}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status + Finalize Confirmation */}
          <div>
            <Label>Estado</Label>
            <Select
              value={status}
              disabled={readOnly}
              onValueChange={(v) => {
                const newStatus = v as TaskStatus;
                if (newStatus === "Servicio completado") {
                  setPendingStatus(newStatus);
                  setShowFinalizeConfirm(true);
                } else {
                  setStatus(newStatus);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Finalize confirmation dialog */}
            <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    ¿Cerrar este servicio?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Está seguro de que quiere cerrar este servicio? El task pasará a
                    <strong> Servicio Completado</strong> y se moverá al Historial de Ventas.
                    Esta acción puede revertirse desde el Historial de Ventas si fue un error.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPendingStatus(null)}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async (e) => {
                      e.preventDefault();
                      if (pendingStatus) {
                        setStatus(pendingStatus);
                        await handleSave(pendingStatus);
                      }
                      setPendingStatus(null);
                      setShowFinalizeConfirm(false);
                    }}
                    className="bg-primary hover:bg-primary/90"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceptar — Cerrar servicio"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>


          {/* Services */}
          <div>
            <Label className="mb-2 block">Servicios y montos</Label>
            {readOnly ? (
              <div className="space-y-1.5">
                {Object.keys(selectedServices).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">Sin servicios asignados</p>
                ) : (
                  Object.entries(selectedServices).map(([catId, amount]) => {
                    const cat = categories.find((c) => c.id === catId);
                    return (
                      <div key={catId} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
                        <span className="text-sm font-medium text-foreground">{cat?.name || "Servicio"}</span>
                        <span className="text-sm font-semibold tabular-nums text-emerald-700">
                          ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((cat) => {
                  const isSelected = cat.id in selectedServices;
                  return (
                    <div key={cat.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        disabled={readOnly}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <span className="text-sm flex-1">{cat.name}</span>
                      {isSelected && (
                        <div className="relative w-28">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={readOnly}
                            value={selectedServices[cat.id] || ""}
                            onChange={(e) =>
                              setSelectedServices((p) => ({ ...p, [cat.id]: parseFloat(e.target.value) || 0 }))
                            }
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            className="pl-6 h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {Object.keys(selectedServices).length > 0 && (
              <div className="flex justify-end mt-2 text-sm font-semibold tabular-nums border-t pt-2">
                Total: ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Specs */}
          <div>
            <Label>Especificaciones</Label>
            <Textarea disabled={readOnly} value={specifications} onChange={(e) => setSpecifications(e.target.value)} rows={2} className="mt-1" />
          </div>

          {/* Assigned & Dates Layout */}
          <div className="space-y-4 pt-2 border-t mt-2">
            <div>
              <Label>Personal asignado</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={readOnly}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Empleado..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(status === "Inspeccion" || (readOnly && (inspectionDate || inspectionTimeStart || inspectionTimeEnd))) && (
              <div className="grid grid-cols-2 gap-3 bg-[#FF6600]/5 p-3 rounded-lg border border-[#FF6600]/20">
                <div className="col-span-2">
                  <Label className="text-[#e65c00]">Fecha de cotización / inspección</Label>
                  <Input type="date" disabled={readOnly} value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="border-[#FF6600]/30 mt-1" />
                </div>
                <div>
                  <Label className="text-[#e65c00]">Hora de inicio</Label>
                  <Input type="time" disabled={readOnly} value={inspectionTimeStart} onChange={(e) => setInspectionTimeStart(e.target.value)} className="border-[#FF6600]/30 mt-1" />
                </div>
                <div>
                  <Label className="text-[#e65c00]">Hora de fin</Label>
                  <Input type="time" disabled={readOnly} value={inspectionTimeEnd} onChange={(e) => setInspectionTimeEnd(e.target.value)} className="border-[#FF6600]/30 mt-1" />
                </div>
              </div>
            )}

            {(status === "Servicio Agendado" || status === "Servicio en proceso" || (readOnly && (serviceDate || serviceTimeStart || serviceTimeEnd))) && (
              <div className="grid grid-cols-2 gap-3 bg-[#09B549]/5 p-3 rounded-lg border border-[#09B549]/20">
                <div className="col-span-2">
                  <Label className="text-[#09B549]">Fecha de servicio</Label>
                  <Input type="date" disabled={readOnly} value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="border-[#09B549]/30 mt-1" />
                </div>
                <div>
                  <Label className="text-[#09B549]">Hora de inicio</Label>
                  <Input type="time" disabled={readOnly} value={serviceTimeStart} onChange={(e) => setServiceTimeStart(e.target.value)} className="border-[#09B549]/30 mt-1" />
                </div>
                <div>
                  <Label className="text-[#09B549]">Hora de fin</Label>
                  <Input type="time" disabled={readOnly} value={serviceTimeEnd} onChange={(e) => setServiceTimeEnd(e.target.value)} className="border-[#09B549]/30 mt-1" />
                </div>
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="space-y-2">
              <Button onClick={() => handleSave()} className="w-full" disabled={saving || deleting}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar cambios
              </Button>
              {isAdmin && onDeleteTask && (
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={saving || deleting}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar tarea
                </Button>
              )}
            </div>
          )}

          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  ¿Eliminar esta tarea?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. La tarea y sus servicios asociados se eliminarán permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!task || !onDeleteTask) return;
                    setDeleting(true);
                    const { error } = await onDeleteTask(task.id);
                    setDeleting(false);
                    setShowDeleteConfirm(false);
                    if (error) {
                      toast({ title: "Error", description: error, variant: "destructive" });
                    } else {
                      toast({ title: "Tarea eliminada" });
                      onOpenChange(false);
                    }
                  }}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
