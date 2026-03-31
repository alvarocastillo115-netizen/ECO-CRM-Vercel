import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Loader2, AlertTriangle } from "lucide-react";
import type { CrmTask, Category, Profile, TaskStatus } from "@/types/crm";
import { STATUS_COLUMNS } from "@/types/crm";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: CrmTask | null;
  categories: Category[];
  employees: Profile[];
  onUpdateTask: (taskId: string, data: any) => Promise<{ error: string | null }>;
  onUpdateStatus: (taskId: string, status: TaskStatus, keepAnEyeData?: any) => Promise<{ error: string | null }>;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  categories,
  employees,
  onUpdateTask,
  onUpdateStatus,
}: TaskDetailDialogProps) {
  const [status, setStatus] = useState<TaskStatus>("To-Do");
  const [description, setDescription] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [keepAnEyeDate, setKeepAnEyeDate] = useState("");
  const [keepAnEyePeriod, setKeepAnEyePeriod] = useState("");
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status as TaskStatus);
      setDescription(task.description);
      setSpecifications(task.specifications);
      setScheduledDate(task.scheduled_date || "");
      setAssignedTo(task.assigned_to_user_id || "");
      setKeepAnEyeDate(task.keep_an_eye_date || "");
      setKeepAnEyePeriod(task.keep_an_eye_period_months?.toString() || "");
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

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);

    // Handle status change to Keep an Eye
    if (status === "Keep an Eye" && (!keepAnEyeDate || !keepAnEyePeriod)) {
      toast({ title: "Error", description: "Fecha y periodo de re-contacto son obligatorios para 'Keep an Eye'", variant: "destructive" });
      setSaving(false);
      return;
    }

    const updateData: any = {
      description,
      specifications,
      scheduled_date: scheduledDate || null,
      assigned_to_user_id: assignedTo || null,
      status,
      services: Object.entries(selectedServices).map(([category_id, amount_allocated]) => ({
        category_id,
        amount_allocated,
      })),
    };

    if (status === "Keep an Eye") {
      updateData.keep_an_eye_date = keepAnEyeDate;
      updateData.keep_an_eye_period_months = parseInt(keepAnEyePeriod);
    }

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
            Creada {format(new Date(task.created_at), "MMM d, yyyy")}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keep an Eye fields */}
          {status === "Keep an Eye" && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 space-y-3">
              <div className="flex items-center gap-2 text-warning text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Configuración de re-contacto
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Fecha último servicio</Label>
                  <Input
                    type="date"
                    value={keepAnEyeDate}
                    onChange={(e) => setKeepAnEyeDate(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">Periodo (meses)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={keepAnEyePeriod}
                    onChange={(e) => setKeepAnEyePeriod(e.target.value)}
                    className="mt-1"
                    placeholder="3"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Services */}
          <div>
            <Label className="mb-2 block">Servicios y montos</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map((cat) => {
                const isSelected = cat.id in selectedServices;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
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
                          value={selectedServices[cat.id] || ""}
                          onChange={(e) =>
                            setSelectedServices((p) => ({ ...p, [cat.id]: parseFloat(e.target.value) || 0 }))
                          }
                          className="pl-6 h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {Object.keys(selectedServices).length > 0 && (
              <div className="flex justify-end mt-2 text-sm font-semibold tabular-nums">
                Total: ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Specs */}
          <div>
            <Label>Especificaciones</Label>
            <Textarea value={specifications} onChange={(e) => setSpecifications(e.target.value)} rows={2} className="mt-1" />
          </div>

          {/* Date + Assigned */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha programada</Label>
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Personal asignado</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Empleado..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name || emp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
