import { useState, useMemo, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, DollarSign, Loader2, Search, Check, ChevronDown } from "lucide-react";
import { type Category, type Client, type Profile, type TaskStatus, STATUS_COLUMNS } from "@/types/crm";
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
    inspection_date: string | null;
    inspection_time?: string;
    service_date: string | null;
    service_time?: string;
    specifications: string;
    assigned_to_user_id: string | null;
    services: { category_id: string; amount_allocated: number }[];
    status: TaskStatus;
  }) => Promise<{ error: string | null }>;
  onCreateClient: (data: { name: string; address: string; phone: string; branch?: string }) => Promise<{ data: Client | null; error: string | null }>;
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
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientBranch, setNewClientBranch] = useState("");
  const clientSearchRef = useRef<HTMLInputElement>(null);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q));
  }, [clients, clientSearch]);
  
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionTimeStart, setInspectionTimeStart] = useState("");
  const [inspectionTimeEnd, setInspectionTimeEnd] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTimeStart, setServiceTimeStart] = useState("");
  const [serviceTimeEnd, setServiceTimeEnd] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus, open]);

  const selectedClient = clients.find(c => c.id === clientId);
  const isFixedClient = selectedClient?.is_fixed || false;

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
    setClientSearch("");
    setNewClientMode(false);
    setNewClientName("");
    setNewClientAddress("");
    setNewClientPhone("");
    setInspectionDate("");
    setInspectionTimeStart("");
    setInspectionTimeEnd("");
    setServiceDate("");
    setServiceTimeStart("");
    setServiceTimeEnd("");
    setSpecifications("");
    setAssignedTo("");
    setSelectedCategories({});
    setStatus(defaultStatus);
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
        branch: newClientBranch.trim(),
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
      inspection_date: inspectionDate || null,
      inspection_time: (inspectionTimeStart || inspectionTimeEnd) ? `${inspectionTimeStart}${inspectionTimeStart && inspectionTimeEnd ? ' - ' : ''}${inspectionTimeEnd}` : "",
      service_date: serviceDate || null,
      service_time: (serviceTimeStart || serviceTimeEnd) ? `${serviceTimeStart}${serviceTimeStart && serviceTimeEnd ? ' - ' : ''}${serviceTimeEnd}` : "",
      specifications,
      assigned_to_user_id: assignedTo || null,
      services,
      status,
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
              <div className="relative">
                {/* Searchable client combobox */}
                <div
                  className="flex items-center border rounded-md px-3 h-9 gap-2 cursor-pointer bg-white hover:border-primary/50 transition-colors"
                  onClick={() => { setClientDropdownOpen(true); setTimeout(() => clientSearchRef.current?.focus(), 50); }}
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    ref={clientSearchRef}
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                    onFocus={() => setClientDropdownOpen(true)}
                    placeholder={clientId ? (clients.find(c => c.id === clientId)?.name ?? "Seleccionar cliente...") : "Buscar cliente..."}
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                    style={{ color: clientId && !clientSearch ? 'inherit' : undefined }}
                  />
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
                {clientDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setClientDropdownOpen(false); setClientSearch(""); }} />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                      ) : (
                        filteredClients.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-primary/5 transition-colors ${
                              c.id === clientId ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                            }`}
                            onClick={() => {
                              setClientId(c.id);
                              setClientSearch("");
                              setClientDropdownOpen(false);
                            }}
                          >
                            <span>{c.name}</span>
                            {c.id === clientId && <Check className="h-3.5 w-3.5 text-primary" />}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {isFixedClient && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-2 text-sm rounded mt-3 flex items-start gap-2">
                <span className="text-orange-600 mt-0.5">★</span>
                <div>
                  <p className="font-semibold">Cliente Fijo detectado.</p>
                  <p className="text-xs opacity-90">Puedes agendar directamente el servicio seleccionando el estatus adecuado.</p>
                </div>
              </div>
            )}
            
            {clientId && !newClientMode && (
              <div className="mt-3">
                <Label>Estatus inicial</Label>
                <Select value={status} onValueChange={(val: TaskStatus) => setStatus(val)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_COLUMNS.map(col => (
                      <SelectItem key={col.id} value={col.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: col.color }} />
                          {col.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                          onWheel={(e) => (e.target as HTMLElement).blur()}
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

          {/* Assigned & Dates Layout */}
          <div className="space-y-4 pt-2 border-t mt-2">
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

            {status === "Inspeccion" && (
              <div className="grid grid-cols-2 gap-3 bg-[#FF6600]/5 p-3 rounded-lg border border-[#FF6600]/20">
                <div>
                  <Label className="text-[#e65c00]">Fecha de cotización / inspección</Label>
                  <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="border-[#FF6600]/30 mt-1" />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-[#e65c00]">Hora de inicio</Label>
                    <Input type="time" value={inspectionTimeStart} onChange={(e) => setInspectionTimeStart(e.target.value)} className="border-[#FF6600]/30 mt-1" />
                  </div>
                  <div>
                    <Label className="text-[#e65c00]">Hora de fin</Label>
                    <Input type="time" value={inspectionTimeEnd} onChange={(e) => setInspectionTimeEnd(e.target.value)} className="border-[#FF6600]/30 mt-1" />
                  </div>
                </div>
              </div>
            )}

            {(status === "Servicio Agendado" || status === "Servicio en proceso") && (
              <div className="grid grid-cols-2 gap-3 bg-[#09B549]/5 p-3 rounded-lg border border-[#09B549]/20">
                <div>
                  <Label className="text-[#09B549]">Fecha de servicio</Label>
                  <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className="border-[#09B549]/30 mt-1" />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-[#09B549]">Hora de inicio</Label>
                    <Input type="time" value={serviceTimeStart} onChange={(e) => setServiceTimeStart(e.target.value)} className="border-[#09B549]/30 mt-1" />
                  </div>
                  <div>
                    <Label className="text-[#09B549]">Hora de fin</Label>
                    <Input type="time" value={serviceTimeEnd} onChange={(e) => setServiceTimeEnd(e.target.value)} className="border-[#09B549]/30 mt-1" />
                  </div>
                </div>
              </div>
            )}
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
