import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, DollarSign, Loader2 } from "lucide-react";
import type { Category, Client, Profile, TaskStatus } from "@/types/crm";
import { toast } from "@/hooks/use-toast";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  categories: Category[];
  employees: Profile[];
  defaultStatus: TaskStatus;
  onCreateTask: (data: {
    client_id: string;
    description: string;
    scheduled_date: string | null;
    specifications: string;
    assigned_to_user_id: string | null;
    services: { category_id: string; amount_allocated: number }[];
  }) => Promise<{ error: string | null }>;
  onCreateClient: (data: { name: string; address: string; phone: string }) => Promise<{ data: Client | null; error: string | null }>;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  clients,
  categories,
  employees,
  defaultStatus,
  onCreateTask,
  onCreateClient,
}: CreateTaskDialogProps) {
  const [clientId, setClientId] = useState("");
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientBranch, setNewClientBranch] = useState("");
  
  const [scheduledDate, setScheduledDate] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => Object.values(selectedCategories).reduce((s, v) => s + (v || 0), 0),
    [selectedCategories]
  );

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) => {
      const copy = { ...prev };
      if (catId in copy) delete copy[catId];
      else copy[catId] = 0;
      return copy;
    });
  };

  const setAmount = (catId: string, amount: number) => {
    setSelectedCategories((prev) => ({ ...prev, [catId]: amount }));
  };

  const resetForm = () => {
    setClientId("");
    setNewClientMode(false);
    setNewClientName("");
    setNewClientAddress("");
    setNewClientPhone("");
    
    setScheduledDate("");
    setSpecifications("");
    setAssignedTo("");
    setSelectedCategories({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let finalClientId = clientId;

    if (newClientMode) {
      if (!newClientName.trim()) {
        toast({ title: "Error", description: "Nombre del cliente requerido", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { data, error } = await onCreateClient({
        name: newClientName.trim(),
        address: newClientAddress.trim(),
        phone: newClientPhone.trim(),
      });
      if (error || !data) {
        toast({ title: "Error", description: error || "No se pudo crear el cliente", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      finalClientId = data.id;
    }

    if (!finalClientId) {
      toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const services = Object.entries(selectedCategories).map(([category_id, amount_allocated]) => ({
      category_id,
      amount_allocated,
    }));

    const { error } = await onCreateTask({
      client_id: finalClientId,
      description: "",
      scheduled_date: scheduledDate || null,
      specifications,
      assigned_to_user_id: assignedTo || null,
      services,
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Tarea creada", description: "La tarea se ha creado exitosamente." });
      resetForm();
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Nueva Tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Cliente</Label>
              <button
                type="button"
                onClick={() => setNewClientMode(!newClientMode)}
                className="text-2xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                {newClientMode ? "Seleccionar existente" : "Nuevo cliente"}
              </button>
            </div>
            {newClientMode ? (
              <div className="space-y-2">
                <Input placeholder="Nombre" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                <Input placeholder="Sucursal" value={newClientBranch} onChange={(e) => setNewClientBranch(e.target.value)} />
                <Input placeholder="Dirección" value={newClientAddress} onChange={(e) => setNewClientAddress(e.target.value)} />
                <Input placeholder="Teléfono" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
              </div>
            ) : (
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Categories multi-select with amounts */}
          <div>
            <Label className="mb-2 block">Servicios</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.map((cat) => {
                const isSelected = cat.id in selectedCategories;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`cat-${cat.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <label
                      htmlFor={`cat-${cat.id}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {cat.name}
                    </label>
                    {isSelected && (
                      <div className="relative w-28">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={selectedCategories[cat.id] || ""}
                          onChange={(e) => setAmount(cat.id, parseFloat(e.target.value) || 0)}
                          className="pl-6 h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {Object.keys(selectedCategories).length > 0 && (
              <div className="flex justify-end mt-2 text-sm font-semibold text-foreground tabular-nums">
                Total: ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* Specs */}
          <div>
            <Label>Especificaciones / Indicaciones</Label>
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

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crear Tarea
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
