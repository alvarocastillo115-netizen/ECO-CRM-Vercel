# Plan de implementación — Sección "Generador de Coti."

> **Cómo usar este documento:** plan de ejecución detallado para pegarse como prompt en un chat
> con el modelo **Sonnet**. Trae el código completo listo para copiar. Sigue los pasos EN ORDEN.
> No inventes cambios fuera de lo aquí descrito.

---

## 0. Contexto para el modelo ejecutor (Sonnet)

Proyecto: **React + TypeScript + Vite + Tailwind + shadcn/ui**, datos en **Supabase**.
Archivos y patrones relevantes ya existentes:

- Rutas: [`src/App.tsx`](../src/App.tsx) (React Router + `lazy()`).
- Menú lateral: [`src/components/AppLayout.tsx`](../src/components/AppLayout.tsx) (array `NAV_ITEMS`).
- Hook de datos: [`src/hooks/useCrmData.ts`](../src/hooks/useCrmData.ts) → expone `employees` (perfiles de usuarios).
- Tipos: [`src/types/crm.ts`](../src/types/crm.ts) (`Profile`).
- Estilos globales / fuentes: [`src/index.css`](../src/index.css).
- Gestión de usuarios: [`src/pages/SettingsPage.tsx`](../src/pages/SettingsPage.tsx) + edge function
  [`supabase/functions/update-employee/index.ts`](../supabase/functions/update-employee/index.ts).

---

## 1. Objetivo

Crear una sección **"Generador de Coti."** que permita generar cotizaciones rápidamente,
replicando el diseño del PDF modelo de ECO Solutions. El usuario llena solo los campos dinámicos
en un formulario, ve una **vista previa** idéntica al modelo, y la exporta con **Imprimir →
Guardar como PDF** del navegador.

### Decisiones ya confirmadas con el cliente
1. **Independiente**: no se conecta a clientes/tareas del CRM ni se guarda historial de cotizaciones.
2. **Salida**: vista previa en pantalla + botón **Imprimir** (el usuario elige "Guardar como PDF").
   No se agregan librerías de PDF.
3. **Líneas de servicio**: texto libre por línea (descripción, cantidad, precio); se pueden
   agregar/quitar filas. El total por línea y el TOTAL se calculan automáticamente.
4. **REF automático**: basado en fecha/hora, formato fijo `A-AAMMDD-HHMM` (no editable, sin BD).
5. **Asesor**: se elige de la **lista de usuarios del sistema** (perfiles). Al elegirlo se
   autocompletan **nombre, email y teléfono**.
6. **Teléfono del asesor**: se **agrega una columna `phone` a los perfiles** (cambio en Supabase)
   para poder autocompletarlo. Los admins podrán capturarlo en Configuración → Usuarios.
7. **Tipo de servicio**: selector con 3 opciones →
   `"SERVICIO RESIDENCIAL"`, `"SERVICIO CORPORATIVO"`, `"SERVICIO ENTRETENIMIENTO Y GASTRONOMÍA"`.

### Campos dinámicos (del PDF modelo)
| Campo | Origen |
|---|---|
| Tipo de servicio (encabezado) | Selector (3 opciones) |
| REF | Automático `A-AAMMDD-HHMM` |
| Cliente: nombre + dirección | Texto libre |
| Asesor: nombre + teléfono + email | Elegido de la lista de usuarios |
| Fecha | Selector de fecha (default: hoy) |
| Líneas de servicio (desc/cant/precio) | Texto libre, filas dinámicas |
| Tiempo de entrega | Texto libre (default "1 día") |
| TOTAL | Calculado = suma de líneas |

### Contenido estático (NO editable; va fijo en la plantilla)
- Logo, textos "Personal profesional… / IVA 13% incluido".
- Validez: "15 días".
- FORMA DE PAGO completa (Efectivo · Transferencia · Compra-click, Cta. corriente 201568664,
  "Solicite Factura o Crédito Fiscal").
- CONDICIONES fijas: "Pago al finalizar el trabajo", "Oferta válida por 15 días".
- Gerente General: "Maria Teresa Ramos".
- Bloque "AUTORIZACIÓN DEL SERVICIO — Nombre y firma del cliente".
- Pie: "LIMPIAMOS · CUIDAMOS · TRANSFORMAMOS", redes, `www.ecosolutionssv.com`.

### Supuesto sobre IVA (confirmado sin corrección)
Los precios **ya incluyen IVA** ("IVA 13% incluido"). Por lo tanto **TOTAL = suma de las líneas**;
NO se calcula IVA por separado.

---

## 2. Arquitectura

- Página nueva con layout de 2 columnas: **formulario** (izquierda) + **vista previa** (derecha).
- La vista previa es un componente que replica el PDF (`QuotePreview`), con `id="quote-print"`.
- **Impresión**: CSS `@media print` oculta todo excepto `#quote-print`; el botón llama a
  `window.print()`. Se fuerza la impresión de colores de fondo con `print-color-adjust: exact`.
- El teléfono del asesor requiere: migración (columna `phone`), tipo `Profile`, edge function
  `update-employee` y un campo en Configuración para capturarlo.

> Nota de nomenclatura: el modelo dice "ASESORA COMERCIAL". Como el asesor se elige de una lista y
> puede ser de cualquier género, en la plantilla se usa **"ASESOR COMERCIAL"** (neutro). Si se
> prefiere el literal del modelo, cambiar ese texto en `QuotePreview.tsx`.

---

## 3. Resumen de archivos

**Nuevos:**
- `src/lib/quote.ts` — tipos, `generateRef()`, `SERVICE_TYPES`, `formatMoney()`.
- `src/components/quote/QuotePreview.tsx` — plantilla imprimible de la cotización.
- `src/pages/QuoteGeneratorPage.tsx` — página (formulario + preview + imprimir).

**Editados:**
- `src/index.css` — fuente serif + estilos `@media print`.
- `src/App.tsx` — ruta `/cotizaciones`.
- `src/components/AppLayout.tsx` — item de menú "Generador de Coti.".
- `src/types/crm.ts` — `phone?: string` en `Profile`.
- `supabase/migrations/20260728000000_add_phone_to_profiles.sql` — **nuevo** (columna `phone`).
- `supabase/functions/update-employee/index.ts` — guardar `phone`.
- `src/pages/SettingsPage.tsx` — capturar `phone` del usuario.

**Pasos manuales de despliegue (Supabase):** aplicar la migración y redeployar la edge function
(ver §12). Sin esos dos pasos, el teléfono del asesor no se guardará (todo lo demás funciona).

---

## 4. PASO 1 — Crear `src/lib/quote.ts`

```ts
export const SERVICE_TYPES = [
  "SERVICIO RESIDENCIAL",
  "SERVICIO CORPORATIVO",
  "SERVICIO ENTRETENIMIENTO Y GASTRONOMÍA",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export interface QuoteLineItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio: number;
}

/** REF automático basado en fecha/hora: "A-AAMMDD-HHMM" (fijo, sin persistencia). */
export function generateRef(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const yy = p(d.getFullYear() % 100);
  const mm = p(d.getMonth() + 1);
  const dd = p(d.getDate());
  const hh = p(d.getHours());
  const mi = p(d.getMinutes());
  return `A-${yy}${mm}${dd}-${hh}${mi}`;
}

/** Formatea un número como moneda: 45 -> "$45.00" */
export function formatMoney(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
```

---

## 5. PASO 2 — Crear `src/components/quote/QuotePreview.tsx`

Componente puro de presentación (la plantilla imprimible). Crear el archivo con este contenido:

```tsx
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { formatMoney, type QuoteLineItem, type ServiceType } from "@/lib/quote";

const HEADER_GREEN = "#123B34";
const LOGO_URL =
  "https://ecosolutionssv.com/wp-content/uploads/2025/03/logo-de-eco-solutions-tranparente-letras-blancas-300x300.png";

interface QuotePreviewProps {
  tipoServicio: ServiceType;
  refCode: string;
  clienteNombre: string;
  clienteDireccion: string;
  asesorNombre: string;
  asesorTelefono: string;
  asesorEmail: string;
  fecha: Date;
  tiempoEntrega: string;
  items: QuoteLineItem[];
}

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

export function QuotePreview({
  tipoServicio, refCode, clienteNombre, clienteDireccion,
  asesorNombre, asesorTelefono, asesorEmail, fecha, tiempoEntrega, items,
}: QuotePreviewProps) {
  const total = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0);
  const fechaFmt = format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div
      id="quote-print"
      className="quote-doc bg-white mx-auto shadow-lg"
      style={{ width: "800px", maxWidth: "100%", color: "#2b2b2b", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-9" style={{ background: HEADER_GREEN, color: "#fff" }}>
        <img src={LOGO_URL} alt="ECO Solutions" crossOrigin="anonymous" style={{ height: 92, objectFit: "contain" }} />
        <div className="text-right">
          <div style={{ ...serif, fontSize: 46, lineHeight: 1, letterSpacing: "0.04em" }}>COTIZACIÓN</div>
          <div className="mt-2 text-[11px] uppercase" style={{ letterSpacing: "0.28em", opacity: 0.85 }}>
            {tipoServicio} · REF. {refCode}
          </div>
        </div>
      </div>

      <div className="px-10 py-8">
        {/* Info row */}
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] mb-2" style={{ color: HEADER_GREEN }}>PREPARADA PARA</p>
            <p className="text-[15px] font-semibold text-slate-800">{clienteNombre || "—"}</p>
            <p className="text-[13px] text-slate-500 whitespace-pre-line mt-0.5">{clienteDireccion}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] mb-2" style={{ color: HEADER_GREEN }}>ASESOR COMERCIAL</p>
            <p className="text-[15px] font-semibold text-slate-800">{asesorNombre || "—"}</p>
            <p className="text-[13px] text-slate-500 mt-0.5">{asesorTelefono}</p>
            <p className="text-[13px] text-slate-500">{asesorEmail}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] mb-2" style={{ color: HEADER_GREEN }}>FECHA</p>
            <p className="text-[15px] font-semibold text-slate-800">{fechaFmt}</p>
            <p className="text-[13px] text-slate-500 mt-0.5">Validez: 15 días</p>
          </div>
        </div>

        {/* Items table */}
        <div className="mt-9">
          <div className="grid grid-cols-[1fr_70px_110px_110px] gap-2 pb-2 border-b-2 text-[10px] font-bold tracking-[0.14em]" style={{ borderColor: HEADER_GREEN, color: HEADER_GREEN }}>
            <div>DESCRIPCIÓN DEL SERVICIO</div>
            <div className="text-center">CANT.</div>
            <div className="text-right">PRECIO</div>
            <div className="text-right">TOTAL</div>
          </div>
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400 border-b">Sin líneas de servicio</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="grid grid-cols-[1fr_70px_110px_110px] gap-2 py-3 border-b border-slate-100 text-[14px] text-slate-700 items-center">
                <div>{it.descripcion || "—"}</div>
                <div className="text-center text-slate-500">{it.cantidad || 0}</div>
                <div className="text-right text-slate-500">{formatMoney(Number(it.precio) || 0)}</div>
                <div className="text-right font-semibold text-slate-800">{formatMoney((Number(it.cantidad) || 0) * (Number(it.precio) || 0))}</div>
              </div>
            ))
          )}
        </div>

        {/* Note + total */}
        <div className="flex justify-between items-end mt-4">
          <p className="text-[12px] text-slate-500 leading-relaxed max-w-[60%]">
            Personal profesional a tu servicio · Personal capacitado<br />
            Productos y maquinaria especializada · IVA 13% incluido
          </p>
          <div className="flex items-baseline gap-3">
            <span className="text-[11px] font-bold tracking-[0.18em]" style={{ color: HEADER_GREEN }}>TOTAL</span>
            <span className="text-2xl font-bold" style={{ color: HEADER_GREEN }}>{formatMoney(total)}</span>
          </div>
        </div>

        {/* Conditions + payment */}
        <div className="grid grid-cols-2 gap-10 mt-10">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] mb-3" style={{ color: HEADER_GREEN }}>CONDICIONES</p>
            <p className="text-[13px] text-slate-600">Tiempo de entrega: <span className="font-semibold text-slate-800">{tiempoEntrega || "—"}</span></p>
            <p className="text-[13px] text-slate-600 mt-1">Pago al finalizar el trabajo</p>
            <p className="text-[13px] text-slate-600 mt-1">Oferta válida por <span className="font-semibold text-slate-800">15 días</span></p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] mb-3" style={{ color: HEADER_GREEN }}>FORMA DE PAGO</p>
            <p className="text-[13px] text-slate-600">Efectivo · Transferencia bancaria · Compra-click</p>
            <p className="text-[13px] text-slate-600 mt-1">Cta. corriente <span className="font-semibold text-slate-800">201568664</span></p>
            <p className="text-[13px] text-slate-600 mt-1">Solicite Factura o Crédito Fiscal</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-10 mt-20">
          <div>
            <div className="border-t border-slate-300 pt-2">
              <p className="text-[10px] font-bold tracking-[0.18em]" style={{ color: HEADER_GREEN }}>GERENTE GENERAL</p>
              <p className="text-[13px] text-slate-600 mt-1">Maria Teresa Ramos</p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-300 pt-2">
              <p className="text-[10px] font-bold tracking-[0.18em]" style={{ color: HEADER_GREEN }}>AUTORIZACIÓN DEL SERVICIO</p>
              <p className="text-[13px] text-slate-600 mt-1">Nombre y firma del cliente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-10 py-5 mt-6 text-[11px]" style={{ background: HEADER_GREEN, color: "#fff" }}>
        <span className="tracking-[0.18em]">LIMPIAMOS · CUIDAMOS · TRANSFORMAMOS</span>
        <span className="flex items-center gap-3">
          <Facebook className="h-3.5 w-3.5" />
          <Instagram className="h-3.5 w-3.5" />
          <span className="opacity-90">ecosolutionssv_</span>
          <Youtube className="h-3.5 w-3.5" />
          <Linkedin className="h-3.5 w-3.5" />
          <span className="opacity-90">www.ecosolutionssv.com</span>
        </span>
      </div>
    </div>
  );
}
```

---

## 6. PASO 3 — Crear `src/pages/QuoteGeneratorPage.tsx`

```tsx
import { useState } from "react";
import { useCrmData } from "@/hooks/useCrmData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Printer, Plus, Trash2, RotateCcw } from "lucide-react";
import { QuotePreview } from "@/components/quote/QuotePreview";
import { SERVICE_TYPES, generateRef, type ServiceType, type QuoteLineItem } from "@/lib/quote";
import { format } from "date-fns";

function newItem(): QuoteLineItem {
  return { id: crypto.randomUUID(), descripcion: "", cantidad: 1, precio: 0 };
}

export default function QuoteGeneratorPage() {
  const { employees, loading } = useCrmData();

  const [refCode, setRefCode] = useState<string>(() => generateRef());
  const [tipoServicio, setTipoServicio] = useState<ServiceType>(SERVICE_TYPES[0]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [asesorId, setAsesorId] = useState("");
  const [fecha, setFecha] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [tiempoEntrega, setTiempoEntrega] = useState("1 día");
  const [items, setItems] = useState<QuoteLineItem[]>([newItem()]);

  const asesor = employees.find((e) => e.id === asesorId);

  const updateItem = (id: string, patch: Partial<QuoteLineItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const resetForm = () => {
    setRefCode(generateRef());
    setTipoServicio(SERVICE_TYPES[0]);
    setClienteNombre(""); setClienteDireccion(""); setAsesorId("");
    setFecha(format(new Date(), "yyyy-MM-dd"));
    setTiempoEntrega("1 día");
    setItems([newItem()]);
  };

  // parseISO-safe: el input date da "yyyy-MM-dd"; se le agrega hora para evitar desfase de zona.
  const fechaDate = new Date(`${fecha}T12:00:00`);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header (no se imprime) */}
      <div className="no-print flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Generador de Coti.</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Llena los campos y genera la cotización</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetForm}>
            <RotateCcw className="h-4 w-4 mr-2" /> Nueva cotización
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir / Guardar PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Formulario (no se imprime) ── */}
        <div className="no-print w-full lg:w-[380px] shrink-0 space-y-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3 border-b"><CardTitle className="text-base">Datos de la cotización</CardTitle></CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label>Tipo de servicio</Label>
                <Select value={tipoServicio} onValueChange={(v) => setTipoServicio(v as ServiceType)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>REF (automático)</Label>
                <Input value={refCode} readOnly className="mt-1 bg-muted/50 text-muted-foreground" />
              </div>

              <div>
                <Label>Nombre del cliente</Label>
                <Input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="mt-1" placeholder="Ej. Alberto Campos" />
              </div>

              <div>
                <Label>Dirección del cliente</Label>
                <Textarea value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} rows={2} className="mt-1" placeholder="Col. Escalón Norte..." />
              </div>

              <div>
                <Label>Asesor comercial</Label>
                <Select value={asesorId} onValueChange={setAsesorId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Elegir asesor..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name || e.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {asesor && !asesor.phone && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Este asesor no tiene teléfono cargado. Agrégalo en Configuración → Usuarios.
                  </p>
                )}
              </div>

              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Tiempo de entrega</Label>
                <Input value={tiempoEntrega} onChange={(e) => setTiempoEntrega(e.target.value)} className="mt-1" placeholder="Ej. 1 día" />
              </div>
            </CardContent>
          </Card>

          {/* Líneas de servicio */}
          <Card className="shadow-card">
            <CardHeader className="pb-3 border-b flex-row items-center justify-between">
              <CardTitle className="text-base">Líneas de servicio</CardTitle>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {items.map((it) => (
                <div key={it.id} className="border rounded-md p-3 space-y-2 relative">
                  <Textarea
                    value={it.descripcion}
                    onChange={(e) => updateItem(it.id, { descripcion: e.target.value })}
                    rows={2}
                    placeholder="Descripción del servicio"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-[11px] text-muted-foreground">Cantidad</Label>
                      <Input
                        type="number" min="0" step="1"
                        value={it.cantidad}
                        onChange={(e) => updateItem(it.id, { cantidad: parseInt(e.target.value) || 0 })}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[11px] text-muted-foreground">Precio unitario</Label>
                      <Input
                        type="number" min="0" step="0.01"
                        value={it.precio}
                        onChange={(e) => updateItem(it.id, { precio: parseFloat(e.target.value) || 0 })}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="self-end mb-1 text-destructive hover:bg-destructive/10 rounded p-1.5"
                      title="Quitar línea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Sin líneas. Usa "Agregar".</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Vista previa ── */}
        <div className="flex-1 overflow-x-auto">
          <QuotePreview
            tipoServicio={tipoServicio}
            refCode={refCode}
            clienteNombre={clienteNombre}
            clienteDireccion={clienteDireccion}
            asesorNombre={asesor?.full_name || ""}
            asesorTelefono={asesor?.phone || ""}
            asesorEmail={asesor?.email || ""}
            fecha={fechaDate}
            tiempoEntrega={tiempoEntrega}
            items={items}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 7. PASO 4 — Editar `src/index.css`

**Edición 4.1 — Agregar la fuente serif.** Reemplaza la línea del `@import` de Google Fonts
(la primera línea del archivo) por esta (agrega `Cormorant+Garamond`):

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap');
```

**Edición 4.2 — Agregar estilos de impresión.** Agrega esto **al final** del archivo:

```css
/* ── Impresión del Generador de Cotizaciones ── */
@media print {
  /* Ocultar todo... */
  body * { visibility: hidden; }
  /* ...excepto la cotización */
  #quote-print, #quote-print * { visibility: visible; }
  #quote-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none !important;
  }
  .no-print { display: none !important; }
  @page { size: A4; margin: 12mm; }
}
```

---

## 8. PASO 5 — Editar `src/App.tsx`

**Edición 5.1 — Import lazy.** Debajo de la línea de `SalesHistoryPage`, agrega:

```ts
const QuoteGeneratorPage = lazy(() => import("@/pages/QuoteGeneratorPage"));
```

**Edición 5.2 — Ruta.** Dentro del grupo protegido con `<AppLayout />` (junto a las demás rutas,
por ejemplo debajo de la ruta `/sales-history`), agrega:

```tsx
                <Route path="/cotizaciones" element={<QuoteGeneratorPage />} />
```

---

## 9. PASO 6 — Editar `src/components/AppLayout.tsx`

**Edición 6.1 — Icono.** En el import de `lucide-react`, agrega `FileText,` a la lista.

**Edición 6.2 — Item de menú.** En el array `NAV_ITEMS`, agrega (por ejemplo, después de
"Historial de Ventas"):

```ts
  { path: "/cotizaciones", label: "Generador de Coti.", icon: FileText, adminOnly: false },
```

> Si esta sección debe ser solo para admins, poner `adminOnly: true` aquí Y envolver la ruta del
> PASO 5 en `<ProtectedRoute adminOnly>...</ProtectedRoute>`.

---

## 10. PASO 7 — Teléfono del asesor (tipo + migración)

**Edición 7.1 — `src/types/crm.ts`.** En la interfaz `Profile`, agrega el campo `phone`:

```ts
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  is_active?: boolean;
}
```

**Edición 7.2 — Crear migración** `supabase/migrations/20260728000000_add_phone_to_profiles.sql`:

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
```

> El hook `useCrmData` ya hace `select("*")` sobre `profiles`, así que una vez exista la columna,
> `employees[i].phone` estará disponible automáticamente. No hay que tocar `useCrmData.ts`.

---

## 11. PASO 8 — Capturar el teléfono en Configuración

**Edición 8.1 — `supabase/functions/update-employee/index.ts`.**

Busca:
```ts
    const { id, email, full_name, password, action } = body;
```
Reemplázalo por:
```ts
    const { id, email, full_name, password, phone, action } = body;
```

Busca:
```ts
    // Update profile table sync
    await supabase.from("profiles").update({ email, full_name }).eq("id", id);
```
Reemplázalo por:
```ts
    // Update profile table sync
    const profileUpdate: Record<string, unknown> = { email, full_name };
    if (phone !== undefined) profileUpdate.phone = phone;
    await supabase.from("profiles").update(profileUpdate).eq("id", id);
```

**Edición 8.2 — `src/pages/SettingsPage.tsx` (componente `EmployeeManager`).**

8.2.a — Ampliar el tipo del estado `employees`. Busca:
```ts
  const [employees, setEmployees] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
```
Reemplázalo por:
```ts
  const [employees, setEmployees] = useState<{ id: string; full_name: string; email: string; phone: string; role: string }[]>([]);
```

8.2.b — Cargar el teléfono. Busca:
```ts
        activeProfiles.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: roles?.find((r: any) => r.user_id === p.id)?.role || "employee",
        }))
```
Reemplázalo por:
```ts
        activeProfiles.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone || "",
          role: roles?.find((r: any) => r.user_id === p.id)?.role || "employee",
        }))
```

8.2.c — Estado del campo de edición de teléfono. Busca:
```ts
  const [editEmail, setEditEmail] = useState("");
```
Agrega debajo:
```ts
  const [editPhone, setEditPhone] = useState("");
```

8.2.d — Enviar `phone` al actualizar. Busca:
```ts
    const { data, error } = await supabase.functions.invoke("update-employee", {
      body: { id, email: editEmail.trim(), full_name: editFullName.trim(), password: editPassword.trim() },
    });
```
Reemplázalo por:
```ts
    const { data, error } = await supabase.functions.invoke("update-employee", {
      body: { id, email: editEmail.trim(), full_name: editFullName.trim(), password: editPassword.trim(), phone: editPhone.trim() },
    });
```

8.2.e — Precargar `phone` al abrir el modo edición. Busca:
```ts
                        onClick={() => { setEditingId(emp.id); setEditFullName(emp.full_name || ""); setEditEmail(emp.email); setEditPassword(""); }}
```
Reemplázalo por:
```ts
                        onClick={() => { setEditingId(emp.id); setEditFullName(emp.full_name || ""); setEditEmail(emp.email); setEditPhone(emp.phone || ""); setEditPassword(""); }}
```

8.2.f — Agregar el input de teléfono en el formulario de edición. Busca:
```tsx
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-8 text-sm" placeholder="Email" type="email" />
```
Agrega **debajo** de esa línea:
```tsx
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-8 text-sm" placeholder="Teléfono (ej. (503) 7700-6846)" />
```

> Con esto, un admin edita un usuario en Configuración → Usuarios y captura su teléfono. Ese
> teléfono aparecerá automáticamente al elegir al asesor en el generador.

---

## 12. Pasos manuales de despliegue en Supabase (IMPORTANTE)

Estos dos pasos NO los hace el código; requieren acción del desarrollador:

1. **Aplicar la migración** (crea la columna `phone`). Alguna de estas opciones:
   - `npx supabase db push`, **o**
   - Ejecutar el SQL del PASO 7.2 en el editor SQL del panel de Supabase.
2. **Redeployar la edge function** modificada:
   - `npx supabase functions deploy update-employee`

Sin el paso 1, la app fallará al leer/guardar `phone`. Sin el paso 2, el teléfono no se guardará
(pero el resto del generador funciona; el teléfono simplemente saldrá vacío).

---

## 13. Verificación

1. `npx tsc --noEmit` → sin errores.
2. `npm run build` → build exitoso.
3. `npm run dev` y validar el checklist (§14).

---

## 14. Checklist de aceptación (QA manual)

- [ ] Aparece "Generador de Coti." en el menú y navega a `/cotizaciones`.
- [ ] El REF se genera solo con formato `A-AAMMDD-HHMM` y no es editable.
- [ ] El selector "Tipo de servicio" tiene exactamente las 3 opciones y se refleja en el encabezado.
- [ ] Al elegir un asesor, se autocompletan nombre y email (y teléfono si está cargado).
- [ ] La vista previa se parece al PDF modelo (encabezado verde, logo, tipografía serif en
      "COTIZACIÓN", tabla de servicios, TOTAL, condiciones, forma de pago, firmas y pie).
- [ ] Agregar/quitar líneas funciona; el total por línea y el TOTAL se recalculan.
- [ ] Cambiar la fecha actualiza el texto en español ("5 de junio de 2026").
- [ ] Cambiar "Tiempo de entrega" se refleja en CONDICIONES.
- [ ] Botón **Imprimir / Guardar PDF**: al imprimir se ve SOLO la cotización (sin menú lateral ni
      formulario), con los fondos verdes visibles. (En el diálogo de impresión debe estar activada
      la opción "Gráficos de fondo / Background graphics".)
- [ ] Configuración → Usuarios: se puede capturar el teléfono de un usuario y luego aparece al
      elegirlo como asesor. *(Requiere §12 aplicado.)*

---

## 15. Fuera de alcance (NO hacer)

- **No** guardar cotizaciones en base de datos ni crear historial.
- **No** conectar con clientes/tareas del CRM (es independiente).
- **No** agregar librerías de PDF (jsPDF/html2canvas); la salida es vía impresión del navegador.
- **No** calcular IVA por separado (los precios ya lo incluyen).

---

## 16. Notas de diseño / posibles ajustes finos

- **Color del encabezado**: `HEADER_GREEN = "#123B34"` en `QuotePreview.tsx`. Ajustar si se quiere
  igualar exactamente el verde del modelo.
- **Tipografía del título**: se usa `Cormorant Garamond` (serif elegante) como aproximación a la
  del modelo. Cambiar en la constante `serif` si se desea otra.
- **Logo**: se reutiliza el logo blanco remoto de ECO Solutions (mismo que el menú lateral). Para
  impresión funciona porque se renderiza en el DOM (no hay problema de CORS como en export a canvas).
- **"ASESOR COMERCIAL"** vs "ASESORA COMERCIAL": ver nota en §2.
```
