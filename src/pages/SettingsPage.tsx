import { useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, Tag, Users, ShieldCheck, ShieldAlert, Pencil, Trash2, Check, X, UserCog, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Administra categorías de servicio y gestión de usuarios del sistema</p>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6">
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            Categorías
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeManager />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Category Manager ─────────────────────────────────────────────────────────
function CategoryManager() {
  const { categories, createCategory, updateCategory, deleteCategory } = useCrmData();
  const { isAdmin } = useAuth();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await createCategory(newName.trim());
    if (error) toast({ title: "Error", description: error, variant: "destructive" });
    else { toast({ title: "Categoría creada" }); setNewName(""); }
    setAdding(false);
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await updateCategory(id, editName.trim());
    if (error) toast({ title: "Error al actualizar", description: error, variant: "destructive" });
    else toast({ title: "Categoría actualizada" });
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await deleteCategory(deleteId);
    if (error) toast({ title: "Error al eliminar", description: error, variant: "destructive" });
    else toast({ title: "Categoría eliminada" });
    setDeleteId(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* List */}
      <Card className="shadow-card">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Categorías de Servicio
          </CardTitle>
          <CardDescription>Servicios disponibles para asignar a tareas del pipeline</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors group min-h-[50px]">
                {editingId === cat.id ? (
                  <div className="flex flex-1 items-center gap-2 mr-2">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && handleEdit(cat.id)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 flex-shrink-0" onClick={() => handleEdit(cat.id)}><Check className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground flex-shrink-0" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{cat.name}</span>
                      {cat.is_custom && <Badge variant="secondary" className="text-[10px] py-0">Personalizada</Badge>}
                    </div>
                    {isAdmin && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(cat.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No hay categorías registradas</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add new */}
      {isAdmin && (
        <Card className="shadow-card h-fit">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Nueva Categoría</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre del servicio</Label>
              <Input
                placeholder="Ej. Fumigación..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="mt-1"
              />
            </div>
            <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="w-full" size="sm">
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Agregar categoría
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. La categoría será eliminada del sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Employee Manager ─────────────────────────────────────────────────────────
function EmployeeManager() {
  const { isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [adding, setAdding] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const [deleteEmpId, setDeleteEmpId] = useState<string | null>(null);

  const loadEmployees = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    if (profiles) {
      // Solo mostrar usuarios activos
      const activeProfiles = profiles.filter((p: any) => p.is_active !== false);
      setEmployees(
        activeProfiles.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: roles?.find((r: any) => r.user_id === p.id)?.role || "employee",
        }))
      );
    }
    setLoaded(true);
  };

  if (!loaded) loadEmployees();

  const handleCreate = async () => {
    if (!email.trim() || !password.trim()) return;
    if (password.length < 6) {
      toast({ title: "Contraseña muy corta", description: "Debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setAdding(true);
    const { data, error } = await supabase.functions.invoke("create-employee", {
      body: { email: email.trim(), password, full_name: fullName.trim() },
    });

    if (error || data?.error) {
      let errorMessage = data?.error || error?.message || "Error desconocido devuelto por el servidor.";
      // Si el edge function explota y supabase-js devuelve un error http, lo hacemos legible
      if (errorMessage.includes("non-2xx status code")) {
        errorMessage = "El servidor rechazó la solicitud. Es probable que este correo ya esté registrado en otra cuenta.";
      }
      toast({ title: "Error al registrar usuario", description: errorMessage, variant: "destructive" });
    } else {
      toast({ title: "Usuario creado", description: `${email} ha sido registrado exitosamente.` });
      setEmail(""); setPassword(""); setFullName("");
      loadEmployees();
    }
    setAdding(false);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a ${name}? Sus registros de ventas se mantendrán en el historial.`)) {
      setUpdating(true);
      const { data, error } = await supabase.functions.invoke("update-employee", {
        body: { id, action: "delete" },
      });
      if (error || data?.error) {
        toast({ title: "Error al eliminar usuario", description: data?.error || error?.message || "Failed", variant: "destructive" });
      } else {
        toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado exitosamente." });
        loadEmployees();
      }
      setUpdating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editEmail.trim() || !editFullName.trim()) return;
    setUpdating(true);
    const { data, error } = await supabase.functions.invoke("update-employee", {
      body: { id, email: editEmail.trim(), full_name: editFullName.trim(), password: editPassword.trim() },
    });
    if (error || data?.error) {
      toast({ title: "Error al actualizar", description: data?.error || error?.message || "Failed", variant: "destructive" });
    } else {
      toast({ title: "Usuario actualizado" });
      setEditingId(null);
      setEditPassword("");
      loadEmployees();
    }
    setUpdating(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoleId(userId);
    // Delete existing role first, then insert new one
    // (unique constraint is on user_id+role pair, so upsert won't work cleanly)
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) {
      toast({ title: "Error al cambiar rol", description: delErr.message, variant: "destructive" });
      setUpdatingRoleId(null);
      return;
    }
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (insErr) {
      toast({ title: "Error al asignar rol", description: insErr.message, variant: "destructive" });
    } else {
      toast({ title: "Rol actualizado", description: `El rol fue cambiado a "${newRole === "admin" ? "Admin" : "Empleado"}".` });
      loadEmployees();
    }
    setUpdatingRoleId(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Users list */}
      <Card className="shadow-card">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Usuarios del Sistema
          </CardTitle>
          <CardDescription>Gestiona los empleados y sus roles de acceso</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-start justify-between py-3.5 px-4 hover:bg-muted/20 transition-colors group">
                {editingId === emp.id ? (
                  <div className="flex-1 space-y-2 mr-2">
                    <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="h-8 text-sm" placeholder="Nombre completo" autoFocus />
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-8 text-sm" placeholder="Email" type="email" />
                    <Input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="h-8 text-sm" placeholder="Nueva Contraseña (Dejar en blanco para mantener)" type="password" />
                    <div className="flex justify-end gap-1 mt-1">
                      <Button variant="ghost" size="sm" className="h-7 px-3 text-muted-foreground" onClick={() => { setEditingId(null); setEditPassword(""); }}>Cancelar</Button>
                      <Button size="sm" className="h-7 px-3 text-xs" disabled={updating} onClick={() => handleUpdate(emp.id)}>
                        {updating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {emp.role === "admin"
                          ? <ShieldCheck className="h-4 w-4 text-primary" />
                          : <Users className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{emp.full_name || emp.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {/* Role selector */}
                      {isAdmin ? (
                        <div className="relative">
                          {updatingRoleId === emp.id
                            ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            : (
                              <Select value={emp.role} onValueChange={(v) => handleRoleChange(emp.id, v)}>
                                <SelectTrigger className="h-7 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    <span className="flex items-center gap-2">
                                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin
                                    </span>
                                  </SelectItem>
                                  <SelectItem value="employee">
                                    <span className="flex items-center gap-2">
                                      <Users className="h-3.5 w-3.5 text-muted-foreground" /> Empleado
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                        </div>
                      ) : (
                        <Badge variant={emp.role === "admin" ? "default" : "secondary"} className="text-xs capitalize">
                          {emp.role === "admin" ? "Admin" : "Empleado"}
                        </Badge>
                      )}
                      {isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleDeleteUser(emp.id, emp.full_name || emp.email)}
                          >
                            <Trash2 className="h-3 w-3 mr-1.5" />
                            Eliminar usuario
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditingId(emp.id); setEditFullName(emp.full_name || ""); setEditEmail(emp.email); setEditPassword(""); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No hay usuarios registrados</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create new employee */}
      {isAdmin && (
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="h-4 w-4 text-primary" />
                Crear Nuevo Usuario
              </CardTitle>
              <CardDescription>El usuario recibirá acceso al sistema con el rol de empleado por defecto</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nombre completo</Label>
                <Input placeholder="Ej. Carlos Ramírez" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                <Input placeholder="usuario@empresa.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contraseña inicial</Label>
                <Input placeholder="Mínimo 8 caracteres" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={handleCreate} disabled={adding || !email.trim() || !password.trim()} className="w-full" size="sm">
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Crear Usuario
              </Button>
            </CardContent>
          </Card>

          {/* Role legend */}
          <Card className="shadow-card bg-slate-50 border-slate-100">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permisos por Rol</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Admin</p>
                    <p className="text-xs text-muted-foreground">Acceso total: Dashboard, Clientes, Comisiones, Historial, Configuración.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Empleado</p>
                    <p className="text-xs text-muted-foreground">Acceso a Servicios y Calendario únicamente.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
