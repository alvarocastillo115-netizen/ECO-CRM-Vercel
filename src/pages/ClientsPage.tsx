import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Search, Pencil, Contact, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Client } from "@/types/crm";
import * as XLSX from "xlsx";

export default function ClientsPage() {
  const { clientsWithDates: clients, tasks, loading, createClient, refetch } = useCrmData();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [importData, setImportData] = useState<{ name: string; branch: string; address: string; phone: string }[] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.branch.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      const mapped = rows.map((r) => ({
        name: (r["Nombre"] || r["nombre"] || "").toString().trim(),
        branch: (r["Sucursal"] || r["sucursal"] || "").toString().trim(),
        address: (r["Dirección"] || r["Direccion"] || r["direccion"] || r["dirección"] || "").toString().trim(),
        phone: (r["Teléfono"] || r["Telefono"] || r["telefono"] || r["teléfono"] || "").toString().trim(),
      })).filter((r) => r.name.length > 0);
      if (mapped.length === 0) {
        toast.error("No se encontraron filas válidas. Asegúrate de tener la columna 'Nombre'.");
        return;
      }
      setImportData(mapped);
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nombre: "", Sucursal: "", Dirección: "", Teléfono: "" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "plantilla_clientes.xlsx");
  };

  const handleBulkImport = async () => {
    if (!importData) return;
    setImporting(true);
    const { error } = await supabase.from("clients").insert(importData);
    if (error) {
      toast.error("Error al importar: " + error.message);
    } else {
      toast.success(`${importData.length} clientes importados correctamente`);
      refetch();
      setImportData(null);
    }
    setImporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión de contactos y clientes</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleFileSelect} />
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Descargar Plantilla
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar clientes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Último Servicio Realizado</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Contact className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditClient(client)}>
                    <TableCell className="font-medium">
                      {client.name}
                      {client.is_fixed && <span className="ml-2 inline-flex items-center text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full font-semibold">★ Fijo</span>}
                    </TableCell>
                    <TableCell>{client.branch || "—"}</TableCell>
                    <TableCell>
                      {client.last_service_date 
                        ? new Date(client.last_service_date).toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : "Sin servicios"
                      }
                    </TableCell>
                    <TableCell>{client.phone || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ClientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={async (data) => {
          const { error } = await createClient(data);
          if (error) toast.error(error);
          else toast.success("Cliente creado");
          return { error };
        }}
      />

      <ClientFormDialog
        open={!!editClient}
        onOpenChange={(open) => !open && setEditClient(null)}
        client={editClient}
        tasks={tasks as any[]}
        onSave={async (data) => {
          if (!editClient) {
            // This case handles the 'refetch' after delete if we pass dummy data
            refetch();
            return { error: null };
          }
          const { error } = await supabase.from("clients").update(data).eq("id", editClient.id);
          if (error) {
            toast.error(error.message);
            return { error: error.message };
          }
          toast.success("Cliente actualizado");
          refetch();
          return { error: null };
        }}
      />

      {/* Bulk Import Preview Dialog */}
      <Dialog open={!!importData} onOpenChange={(open) => !open && setImportData(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa de importación ({importData?.length} clientes)</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Teléfono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importData?.slice(0, 50).map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.branch || "—"}</TableCell>
                  <TableCell>{row.address || "—"}</TableCell>
                  <TableCell>{row.phone || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {importData && importData.length > 50 && (
            <p className="text-xs text-muted-foreground text-center">Mostrando 50 de {importData.length} filas</p>
          )}
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setImportData(null)}>Cancelar</Button>
            <Button onClick={handleBulkImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Importar {importData?.length} clientes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientFormDialog({
  open,
  onOpenChange,
  client,
  tasks,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  tasks?: any[];
  onSave: (data: { name: string; address: string; phone: string; branch: string; is_fixed: boolean }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState(client?.name || "");
  const [branch, setBranch] = useState(client?.branch || "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isFixed, setIsFixed] = useState(client?.is_fixed || false);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAuth();

  React.useEffect(() => {
    if (open) {
      setName(client?.name || "");
      setBranch(client?.branch || "");
      setAddress(client?.address || "");
      setPhone(client?.phone || "");
      setIsFixed(client?.is_fixed || false);
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await onSave({
      name: name.trim(),
      branch: branch.trim(),
      address: address.trim(),
      phone: phone.trim(),
      is_fixed: isFixed,
    });
    if (!error) {
      onOpenChange(false);
      setName(""); setBranch(""); setAddress(""); setPhone(""); setIsFixed(false);
    }
    setSaving(false);
  };

  const clientTasks = client && tasks ? tasks.filter(t => t.client_id === client.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={client ? "sm:max-w-[700px] max-h-[90vh] overflow-y-auto" : "sm:max-w-[420px]"}>
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente e Historial" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className={client ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""}>
          <form onSubmit={handleSubmit} className="space-y-3">
          <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required /></div>
          <div><Label>Sucursal</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-1" placeholder="Ej: Sede Central" /></div>
          <div><Label>Dirección</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" /></div>
          <div><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
          <div className="flex items-center gap-2 mt-3 pt-2 border-t">
            <input type="checkbox" id="is_fixed" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="is_fixed" className="font-semibold text-orange-600 flex items-center">★ Marcar como Cliente Fijo</Label>
          </div>
          <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {client ? "Guardar cambios" : "Crear Cliente"}
          </Button>

          {client && isAdmin && (
            <Button 
              type="button" 
              variant="destructive" 
              className="w-full mt-2" 
              disabled={saving}
              onClick={async () => {
                if (!window.confirm("¿Estás seguro de eliminar este cliente?")) return;
                setSaving(true);
                const { error } = await supabase.from("clients").delete().eq("id", client.id);
                if (error) {
                  toast.error("Error al eliminar: " + error.message);
                } else {
                  toast.success("Cliente eliminado");
                  onOpenChange(false);
                  onSave({ name: "", branch: "", address: "", phone: "", is_fixed: false }); // Trigger refetch hack or just refetch
                }
                setSaving(false);
              }}
            >
              Eliminar Cliente
            </Button>
          )}
        </form>
        {client && (
          <div className="border-l pl-6 flex flex-col h-full bg-slate-50/50 rounded-r-lg">
            <h4 className="font-semibold text-sm mb-3">Historial de Servicios</h4>
            <div className="flex-1 overflow-y-auto max-h-[350px] pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-center text-muted-foreground">Sin historial</TableCell>
                    </TableRow>
                  ) : (
                    clientTasks.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(t.created_at), "dd MMM yy")}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{t.status}</TableCell>
                        <TableCell className="text-xs text-right text-emerald-600 font-bold">
                          ${Number(t.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
