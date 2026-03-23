import { useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Tag, Users, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Administra categorías y empleados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryManager />
        <EmployeeManager />
      </div>
    </div>
  );
}

function CategoryManager() {
  const { categories, createCategory } = useCrmData();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { error } = await createCategory(newName.trim());
    if (error) toast({ title: "Error", description: error, variant: "destructive" });
    else {
      toast({ title: "Categoría creada" });
      setNewName("");
    }
    setAdding(false);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Categorías de Servicio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nueva categoría..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={adding || !newName.trim()} size="sm">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm">{cat.name}</span>
              {cat.is_custom && (
                <Badge variant="secondary" className="text-2xs">Personalizada</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeManager() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [adding, setAdding] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadEmployees = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    if (profiles) {
      setEmployees(
        profiles.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: roles?.find((r: any) => r.user_id === p.id)?.role || "sin rol",
        }))
      );
    }
    setLoaded(true);
  };

  if (!loaded) loadEmployees();

  const handleCreate = async () => {
    if (!email.trim() || !password.trim()) return;
    setAdding(true);

    // Sign up via edge function to create user without logging out current admin
    const { data, error } = await supabase.functions.invoke("create-employee", {
      body: { email: email.trim(), password, full_name: fullName.trim() },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message || "Failed", variant: "destructive" });
    } else {
      toast({ title: "Empleado creado", description: `${email} ha sido registrado.` });
      setEmail("");
      setPassword("");
      setFullName("");
      loadEmployees();
    }
    setAdding(false);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Gestión de Empleados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={handleCreate} disabled={adding || !email.trim() || !password.trim()} className="w-full" size="sm">
            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Crear Empleado
          </Button>
        </div>

        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{emp.full_name || emp.email}</p>
                <p className="text-2xs text-muted-foreground">{emp.email}</p>
              </div>
              <Badge variant={emp.role === "admin" ? "default" : "secondary"} className="text-2xs capitalize">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {emp.role}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
