import { useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Search, Pencil, Contact } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Client } from "@/types/crm";

export default function ClientsPage() {
  const { clients, loading, createClient, refetch } = useCrmData();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.branch.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

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
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Dirección</TableHead>
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
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.branch || "—"}</TableCell>
                    <TableCell>{client.address || "—"}</TableCell>
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
          if (error) toast({ title: "Error", description: error, variant: "destructive" });
          else toast({ title: "Cliente creado" });
          return { error };
        }}
      />

      <ClientFormDialog
        open={!!editClient}
        onOpenChange={(open) => !open && setEditClient(null)}
        client={editClient}
        onSave={async (data) => {
          if (!editClient) return { error: "No client" };
          const { error } = await supabase.from("clients").update(data).eq("id", editClient.id);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            return { error: error.message };
          }
          toast({ title: "Cliente actualizado" });
          refetch();
          return { error: null };
        }}
      />
    </div>
  );
}

function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (data: { name: string; address: string; phone: string; branch: string }) => Promise<{ error: string | null }>;
}) {
  const [name, setName] = useState(client?.name || "");
  const [branch, setBranch] = useState(client?.branch || "");
  const [address, setAddress] = useState(client?.address || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [saving, setSaving] = useState(false);

  // Reset form when client changes
  useState(() => {
    setName(client?.name || "");
    setBranch(client?.branch || "");
    setAddress(client?.address || "");
    setPhone(client?.phone || "");
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    const { error } = await onSave({
      name: name.trim(),
      branch: branch.trim(),
      address: address.trim(),
      phone: phone.trim(),
    });
    if (!error) {
      onOpenChange(false);
      setName("");
      setBranch("");
      setAddress("");
      setPhone("");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label>Sucursal</Label>
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-1" placeholder="Ej: Sede Central" />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {client ? "Guardar cambios" : "Crear Cliente"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
