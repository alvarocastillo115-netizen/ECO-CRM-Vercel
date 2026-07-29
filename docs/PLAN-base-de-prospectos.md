# Plan de implementación — Sección "Base de Prospectos"

> **Cómo usar este documento:** este es un plan de ejecución detallado, pensado para pegarse
> como prompt en un chat con el modelo **Sonnet**. Contiene el código completo listo para copiar.
> Sigue los pasos en orden. No inventes cambios fuera de los descritos aquí.

---

## 0. Contexto para el modelo ejecutor (Sonnet)

Proyecto: CRM en **React + TypeScript + Vite + Tailwind + shadcn/ui**, datos en **Supabase**.
Estructura relevante ya existente:

- Rutas: [`src/App.tsx`](../src/App.tsx) (React Router, páginas con `lazy()`).
- Navegación lateral: [`src/components/AppLayout.tsx`](../src/components/AppLayout.tsx) (array `NAV_ITEMS`).
- Datos CRM: [`src/hooks/useCrmData.ts`](../src/hooks/useCrmData.ts) (hook `useCrmData()` con `tasks`, `updateTaskStatus`, etc.).
- Tipos: [`src/types/crm.ts`](../src/types/crm.ts) (`CrmTask`, `TaskStatus`, `STATUS_COLUMNS`).
- Pipeline / Servicios: [`src/pages/KanbanPage.tsx`](../src/pages/KanbanPage.tsx).
- Página filtrada de referencia (copiar su estilo): [`src/pages/SalesHistoryPage.tsx`](../src/pages/SalesHistoryPage.tsx).

Modelo de datos clave (tabla `crm_tasks`), campos usados en este plan:
- `id: string`
- `status: TaskStatus` — uno de: `"Primer contacto" | "Inspeccion" | "Cotizacion" | "Servicio Agendado" | "Servicio en proceso" | "Servicio completado" | "Revisar Urgente"`.
- `created_at: string` (timestamp ISO).
- `assigned_to_user_id: string | null`.
- `client?: { name, branch, phone, address, ... }` (join ya resuelto por `useCrmData`).
- `total_amount: number`.

Cada "tarea" (`crm_task`) pertenece a un cliente. Cuando el usuario dice "un cliente en Primer
contacto", en el modelo eso es **una tarea con `status === "Primer contacto"`**.

---

## 1. Objetivo

Crear una nueva sección **"Base de Prospectos"** que muestre automáticamente las tareas que
llevan **5 días o más** en estado `"Primer contacto"` (contados desde `created_at`).

Reglas de negocio:
1. Una tarea nueva que se queda en `"Primer contacto"` durante **5 días** debe aparecer en la
   Base de Prospectos (y salir del Kanban/tabla de Servicios).
2. Todo lo que **ya existe** en el sistema en `"Primer contacto"` con **más de 5 días** de
   creado debe aparecer también, de inmediato.
3. Desde la Base de Prospectos se puede **reactivar** un prospecto moviéndolo a una etapa
   siguiente del pipeline (Inspección, Cotización, etc.).

---

## 2. Arquitectura elegida: **vista calculada por edad** (sin cambios en BD)

Un prospecto se **deriva** de datos ya existentes, NO se persiste un estado nuevo:

> `esProspecto(tarea) === (tarea.status === "Primer contacto" && díasDesde(created_at) >= 5)`

Ventajas (por esto se eligió este enfoque):
- **Cero migraciones, cero cron, cero cambios de esquema ni de RLS.**
- Envejecimiento **automático**: cubre las tareas nuevas (aparecen al cumplir 5 días) y las
  existentes viejas (aparecen al instante), sin ningún job.
- Reversible y sin riesgo de corromper datos.

Implicación importante: como es una vista derivada, hay que **excluir** los prospectos de las
vistas activas (Kanban "Primer contacto" y tabla de Servicios) para que visualmente "se muevan".

> ⚠️ **NO** agregar un estado `"Prospecto"` a `TaskStatus` ni a `STATUS_COLUMNS`. **NO** crear
> migraciones SQL. **NO** tocar Supabase. Todo es cliente.

### Limitación conocida (aceptada)
El conteo de días usa `created_at`. Si una tarea fue creada en otra etapa y luego regresada a
`"Primer contacto"`, el reloj no se reinicia (usa la fecha de creación original). Esto es
aceptable para el MVP. La reactivación mueve el prospecto a una etapa **posterior**, por lo que
no se cae en el caso de "volver a Primer contacto con reloj viejo".

---

## 3. Cambios a realizar (resumen)

| # | Archivo | Acción |
|---|---------|--------|
| 1 | `src/lib/prospects.ts` | **Crear** — helper con umbral y predicado `isProspect`. |
| 2 | `src/pages/ProspectsPage.tsx` | **Crear** — la nueva página. |
| 3 | `src/App.tsx` | **Editar** — import lazy + ruta `/prospects`. |
| 4 | `src/components/AppLayout.tsx` | **Editar** — item de menú "Base de Prospectos". |
| 5 | `src/pages/KanbanPage.tsx` | **Editar** — excluir prospectos del Kanban y de la tabla. |

Verificación final: `npx tsc --noEmit` debe pasar sin errores.

---

## 4. PASO 1 — Crear `src/lib/prospects.ts`

Crear el archivo con **exactamente** este contenido:

```ts
import { differenceInDays } from "date-fns";
import type { CrmTask } from "@/types/crm";

/** Días en "Primer contacto" a partir de los cuales una tarea se considera prospecto. */
export const PROSPECT_THRESHOLD_DAYS = 5;

/** Días transcurridos desde que la tarea fue creada (periodos completos de 24h). */
export function daysSinceCreated(task: Pick<CrmTask, "created_at">): number {
  return differenceInDays(new Date(), new Date(task.created_at));
}

/**
 * Una tarea es "prospecto" cuando lleva PROSPECT_THRESHOLD_DAYS o más días
 * en estado "Primer contacto" (medido desde created_at).
 *
 * Nota: este predicado solo devuelve true para "Primer contacto", por lo que
 * usar `!isProspect(t)` como filtro es seguro para tareas de cualquier estado.
 */
export function isProspect(task: Pick<CrmTask, "status" | "created_at">): boolean {
  if (task.status !== "Primer contacto") return false;
  return daysSinceCreated(task) >= PROSPECT_THRESHOLD_DAYS;
}
```

---

## 5. PASO 2 — Crear `src/pages/ProspectsPage.tsx`

Crear el archivo con **exactamente** este contenido:

```tsx
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
```

---

## 6. PASO 3 — Editar `src/App.tsx`

**Edición 3.1 — Agregar el import lazy.** Busca la línea:

```ts
const SalesHistoryPage = lazy(() => import("@/pages/SalesHistoryPage"));
```

Y agrega justo debajo:

```ts
const ProspectsPage = lazy(() => import("@/pages/ProspectsPage"));
```

**Edición 3.2 — Agregar la ruta.** Busca el bloque de la ruta de sales-history:

```tsx
                <Route
                  path="/sales-history"
                  element={
                    <ProtectedRoute>
                      <SalesHistoryPage />
                    </ProtectedRoute>
                  }
                />
```

Y agrega justo debajo (dentro del mismo grupo `<Route element={<ProtectedRoute><AppLayout/></ProtectedRoute>}>`):

```tsx
                <Route path="/prospects" element={<ProspectsPage />} />
```

---

## 7. PASO 4 — Editar `src/components/AppLayout.tsx`

**Edición 4.1 — Importar un icono.** Busca la línea de import de `lucide-react` que incluye
`Contact,` y agrega `UserPlus,` a la lista. Por ejemplo, cambia:

```ts
  Contact,
  DollarSign,
```

por:

```ts
  Contact,
  UserPlus,
  DollarSign,
```

**Edición 4.2 — Agregar el item de navegación.** En el array `NAV_ITEMS`, busca:

```ts
  { path: "/", label: "Servicios", icon: KanbanSquare, adminOnly: false },
```

Y agrega justo debajo:

```ts
  { path: "/prospects", label: "Base de Prospectos", icon: UserPlus, adminOnly: false },
```

---

## 8. PASO 5 — Editar `src/pages/KanbanPage.tsx`

Objetivo: que los prospectos **desaparezcan** del Kanban (columna "Primer contacto") y de la
tabla de Servicios, para que visualmente se hayan "movido" a la nueva sección.

**Edición 5.1 — Importar el helper.** Busca la línea:

```ts
import { useCrmData } from "@/hooks/useCrmData";
```

Y agrega justo debajo:

```ts
import { isProspect } from "@/lib/prospects";
```

**Edición 5.2 — Excluir prospectos de las columnas del Kanban.** Busca:

```ts
  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);
```

Y reemplázalo por:

```ts
  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status && !isProspect(t));
```

**Edición 5.3 — Excluir prospectos de la tabla de Servicios.** Busca:

```ts
  const filteredTableTasks = tasks
    .filter(t => t.status !== "Servicio completado")
```

Y reemplázalo por:

```ts
  const filteredTableTasks = tasks
    .filter(t => t.status !== "Servicio completado")
    .filter(t => !isProspect(t))
```

> Nota: `isProspect` solo es `true` para tareas en "Primer contacto" con 5+ días, así que estos
> filtros no afectan a ninguna otra etapa.

---

## 9. Verificación (obligatoria)

1. Ejecutar el chequeo de tipos:
   ```
   npx tsc --noEmit
   ```
   Debe terminar **sin errores**.

2. (Opcional pero recomendado) Build completo:
   ```
   npm run build
   ```

3. Arrancar la app (`npm run dev`) y validar manualmente (ver checklist abajo).

---

## 10. Checklist de aceptación (QA manual)

- [ ] Aparece "Base de Prospectos" en el menú lateral y navega a `/prospects`.
- [ ] La página lista SOLO tareas en "Primer contacto" con 5+ días desde su creación.
- [ ] Una tarea en "Primer contacto" con **menos** de 5 días **NO** aparece en Prospectos y **SÍ**
      sigue en el Kanban / tabla de Servicios.
- [ ] Una tarea en "Primer contacto" con **5+ días** **SÍ** aparece en Prospectos y **YA NO**
      aparece en el Kanban / tabla de Servicios (se "movió").
- [ ] La columna "Días esperando" muestra el número correcto de días.
- [ ] El botón "Reactivar" mueve el prospecto a la etapa elegida; tras reactivar, desaparece de
      Prospectos y reaparece en el pipeline activo en la etapa correspondiente.
- [ ] Un empleado (no admin) solo ve sus propios prospectos; un admin ve todos.
- [ ] La búsqueda filtra por cliente, sucursal, teléfono y vendedor.

### Cómo probar el umbral de 5 días sin esperar
En la BD (Supabase, tabla `crm_tasks`), tomar una tarea en "Primer contacto" y poner su
`created_at` a una fecha de hace 6+ días. Al refrescar la app debe aparecer en Prospectos y
salir del Kanban.

---

## 11. Fuera de alcance (NO hacer en esta tarea)

- **No** agregar el estado `"Prospecto"` a `TaskStatus`/`STATUS_COLUMNS`.
- **No** crear migraciones SQL ni tocar Supabase / RLS / edge functions.
- **No** modificar el Dashboard. (Consideración futura: el Dashboard sigue contando estas tareas
  viejas dentro de "Primer contacto" en sus métricas de pipeline; si en el futuro se quiere que
  el Dashboard también las excluya, se haría con el mismo helper `isProspect`, pero **no** ahora.)
- **No** implementar reinicio del conteo de días ni columnas extra (queda como mejora futura).

---

## 12. Resumen de archivos tocados

**Nuevos:**
- `src/lib/prospects.ts`
- `src/pages/ProspectsPage.tsx`
- `docs/PLAN-base-de-prospectos.md` (este documento)

**Editados:**
- `src/App.tsx` (import + ruta)
- `src/components/AppLayout.tsx` (import icono + item de menú)
- `src/pages/KanbanPage.tsx` (import + 2 filtros)

Sin cambios de base de datos.
