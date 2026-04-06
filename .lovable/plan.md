

## Plan: Bulk Client Upload, Spanish Labels, Pie Chart Filter & Weekly Scheduled Trend

### 1. Bulk Client Upload via Excel (`ClientsPage.tsx`)

Add an "Importar Excel" button next to "Nuevo Cliente" that:
- Opens a file input accepting `.xlsx` and `.csv` files
- Parses the file client-side using the `xlsx` library (SheetJS)
- Expects columns: **Nombre**, **Sucursal**, **Dirección**, **Teléfono** (matching the `clients` table fields)
- Shows a preview table of parsed rows before confirming import
- On confirm, bulk-inserts all rows into `clients` via Supabase
- Shows a toast with success count and any errors

**New dependency**: `xlsx` (SheetJS) for parsing Excel files client-side.

---

### 2. Translate All Labels to Spanish (except Kanban, Pipeline, Dashboard)

Audit and update labels across all pages:

- **`AppLayout.tsx`**: Keep "Kanban", "Dashboard" as-is. Already has "Calendario", "Clientes", "Configuración" in Spanish.
- **`KanbanPage.tsx`**: Title stays "Tablero Kanban". Already mostly Spanish.
- **`STATUS_COLUMNS` in `crm.ts`**: Keep English status IDs but change display titles:
  - "To-Do" → "Por Hacer"
  - "In Progress" → "En Progreso"
  - "Completed" → "Completado"
  - "Keep an Eye" → "En Seguimiento"
  - "Need Revision" → "Necesita Revisión"
- **`DashboardPage.tsx`**: "Pipeline" stays. Chart titles, axis labels, tooltips all in Spanish (mostly already done).
- **`TaskDetailDialog.tsx`**: "Estado", "Servicios y montos" — already Spanish. Date format to Spanish locale.
- **`SettingsPage.tsx`**: Already Spanish.
- **`CalendarPage.tsx`**: Already Spanish.

---

### 3. Pie Chart with Real Percentages + Filter (`DashboardPage.tsx`)

Current issue: The pie chart label uses `percent * 100` but recharts `percent` is already 0-1, so it shows the wrong value. Also, the pie only uses completed tasks.

Changes:
- **Fix percentage calculation**: Compute real percentages manually (service amount / total * 100) and display as `XX.X%` labels
- **Add a filter dropdown** with 3 options: "Venta Total" (all tasks), "Venta Cerrada" (Completed), "Pipeline" (To-Do + In Progress)
- Filter applies to the pie chart data, recalculating percentages based on selected filter
- Labels show `ServiceName XX.X%` format

---

### 4. Weekly Scheduled Services Trend Chart (`DashboardPage.tsx`)

Add a new chart: **"Tendencia Semanal de Servicios Agendados"**

- Groups tasks by the **`scheduled_date`** field (not `created_at`)
- Counts the number of tasks (or services) scheduled per week
- Displays as a Line or Bar chart with week labels
- Shows last 12 weeks
- X-axis: week start date, Y-axis: count of scheduled services

---

### Files Modified

| File | Changes |
|---|---|
| `src/pages/ClientsPage.tsx` | Add bulk import button, file parsing, preview dialog |
| `src/types/crm.ts` | Update `STATUS_COLUMNS` display titles to Spanish |
| `src/pages/DashboardPage.tsx` | Fix pie chart %, add filter dropdown, add weekly scheduled trend chart |
| `package.json` | Add `xlsx` dependency |

### Technical Details

- **Excel parsing**: Uses `xlsx` (SheetJS) library to read `.xlsx`/`.csv` files in-browser. Maps column headers to database fields. Validates required `name` field before insert.
- **Pie chart fix**: Instead of relying on recharts' built-in `percent` prop, pre-calculate `(serviceValue / totalValue * 100)` and pass as a data field. The label renderer uses this pre-calculated value.
- **Filter state**: A `useState` with values `"total" | "closed" | "pipeline"` controls which task subset feeds the pie chart computation.
- **Weekly scheduled trend**: Uses `date-fns` `startOfWeek` on each task's `scheduled_date`, groups and counts per week, renders as a `BarChart`.

