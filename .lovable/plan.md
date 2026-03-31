

## Plan: Calendar View, Clients Page, Dashboard Overhaul & UI Tweaks

### Summary
Add a Calendar page, a Clients management page, revamp the Dashboard with 9 specific metrics, and make several UI label/field changes across task forms.

---

### 1. Database Changes

**Add `branch` column to `clients` table** (migration):
```sql
ALTER TABLE public.clients ADD COLUMN branch text NOT NULL DEFAULT '';
```

No other schema changes needed — all other data already exists.

---

### 2. New Pages & Routes

**A. Calendar Page (`src/pages/CalendarPage.tsx`)**
- Full-page calendar view (month grid) showing tasks by their `scheduled_date`
- Each day cell shows task cards (client name + service badges)
- Click a day to see task list; click a task to open `TaskDetailDialog`
- Uses existing `useCrmData` hook
- Navigation: add "Calendario" to sidebar (visible to all roles)

**B. Clients Page (`src/pages/ClientsPage.tsx`)**
- Table/list of all clients with columns: Name, Branch, Address, Phone
- "New Client" button opens inline form or dialog
- Click a client row to edit (name, branch, address, phone)
- Admin-only page
- Navigation: add "Clientes" to sidebar

---

### 3. UI Label & Field Changes

**A. Remove "Descripción" field from task dialogs:**
- `CreateTaskDialog.tsx`: Remove the description `<Textarea>` block
- `TaskDetailDialog.tsx`: Remove the description `<Textarea>` block
- Keep `specifications` field only

**B. Rename "Asignar a" → "Personal asignado":**
- `CreateTaskDialog.tsx`: Change label text
- `TaskDetailDialog.tsx`: Change label text

**C. Update `Client` type** in `src/types/crm.ts` to include `branch: string`

**D. Update `CreateTaskDialog`** client creation form to include "Sucursal" field

---

### 4. Dashboard Overhaul (`src/pages/DashboardPage.tsx`)

Complete rewrite with 9 sections:

1. **KPI Cards (3):** Ventas Cobradas, Pipeline, Tareas Activas (keep existing style)
2. **Ventas por Servicio** — Bar chart showing revenue per service category (completed tasks)
3. **Top 5 Servicios con Mayor Venta** — Horizontal bar chart or ranked list
4. **Top Bottom 5 Servicios con Menor Venta** — Horizontal bar chart or ranked list
5. **Pie Chart** — Percentage representation of each service in total revenue
6. **Tendencia Semanal** — Line chart with weekly revenue (instead of monthly)
7. **Top 10 Clientes** — Ranked table (expanded from current top 5)

All data derived from existing `useCrmData` tasks/services. Uses `recharts`.

---

### 5. Navigation Updates (`AppLayout.tsx`)

Add two new nav items:
- `{ path: "/calendar", label: "Calendario", icon: CalendarDays, adminOnly: false }`
- `{ path: "/clients", label: "Clientes", icon: Contact, adminOnly: true }`

Add routes in `App.tsx` for `/calendar` and `/clients`.

---

### Files Modified
- `src/types/crm.ts` — add `branch` to Client
- `src/hooks/useCrmData.ts` — update createClient to include branch
- `src/components/AppLayout.tsx` — add nav items
- `src/App.tsx` — add routes
- `src/components/crm/CreateTaskDialog.tsx` — remove description, add branch, rename label
- `src/components/crm/TaskDetailDialog.tsx` — remove description, rename label
- `src/pages/DashboardPage.tsx` — full rewrite with 9 metrics
- **New:** `src/pages/CalendarPage.tsx`
- **New:** `src/pages/ClientsPage.tsx`
- **Migration:** add `branch` column to clients

