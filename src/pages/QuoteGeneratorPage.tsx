import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Plus, Trash2, RotateCcw } from "lucide-react";
import { QuotePreview } from "@/components/quote/QuotePreview";
import { SERVICE_TYPES, generateRef, ASESOR_EMAIL, type ServiceType, type QuoteLineItem } from "@/lib/quote";
import { format } from "date-fns";

function newItem(): QuoteLineItem {
  // Todos los campos vacíos para poder escribir info nueva de inmediato.
  return { id: crypto.randomUUID(), descripcion: "", cantidad: "", precio: "" };
}

export default function QuoteGeneratorPage() {
  const [refCode, setRefCode] = useState<string>(() => generateRef());
  const [tipoServicio, setTipoServicio] = useState<ServiceType>(SERVICE_TYPES[0]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [asesorNombre, setAsesorNombre] = useState("");
  const [asesorTelefono, setAsesorTelefono] = useState("");
  const [fecha, setFecha] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [tiempoEntrega, setTiempoEntrega] = useState("1 día");
  const [incluyeIva, setIncluyeIva] = useState(true);
  const [items, setItems] = useState<QuoteLineItem[]>([newItem()]);

  const updateItem = (id: string, patch: Partial<QuoteLineItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const resetForm = () => {
    setRefCode(generateRef());
    setTipoServicio(SERVICE_TYPES[0]);
    setClienteNombre(""); setClienteDireccion("");
    setAsesorNombre(""); setAsesorTelefono("");
    setFecha(format(new Date(), "yyyy-MM-dd"));
    setTiempoEntrega("1 día");
    setIncluyeIva(true);
    setItems([newItem()]);
  };

  // Imprime nombrando el archivo como "Cotizacion_<cliente>" (el navegador usa
  // document.title como nombre por defecto al "Guardar como PDF").
  const handlePrint = () => {
    const prevTitle = document.title;
    const clean = clienteNombre.trim().replace(/[\\/:*?"<>|]+/g, "").trim();
    document.title = clean ? `Cotizacion_${clean}` : "Cotizacion";
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  // parseISO-safe: el input date da "yyyy-MM-dd"; se le agrega hora para evitar desfase de zona.
  const fechaDate = new Date(`${fecha}T12:00:00`);

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
          <Button size="sm" onClick={handlePrint}>
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
                <Label>Nombre del asesor</Label>
                <Input value={asesorNombre} onChange={(e) => setAsesorNombre(e.target.value)} className="mt-1" placeholder="Ej. Engie Reina" />
              </div>

              <div>
                <Label>Teléfono del asesor</Label>
                <Input value={asesorTelefono} onChange={(e) => setAsesorTelefono(e.target.value)} className="mt-1" placeholder="Ej. (503) 7700-6846" />
                <p className="text-[11px] text-muted-foreground mt-1">Correo fijo: {ASESOR_EMAIL}</p>
              </div>

              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Tiempo de entrega</Label>
                <Input value={tiempoEntrega} onChange={(e) => setTiempoEntrega(e.target.value)} className="mt-1" placeholder="Ej. 1 día" />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="iva" checked={incluyeIva} onCheckedChange={(v) => setIncluyeIva(v === true)} />
                <Label htmlFor="iva" className="cursor-pointer font-normal">Los precios incluyen IVA (13%)</Label>
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
                        onChange={(e) => updateItem(it.id, { cantidad: e.target.value === "" ? "" : (parseInt(e.target.value) || 0) })}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        placeholder="0"
                        className="h-8 text-sm mt-0.5"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[11px] text-muted-foreground">Precio unitario</Label>
                      <Input
                        type="number" min="0" step="0.01"
                        value={it.precio}
                        onChange={(e) => updateItem(it.id, { precio: e.target.value === "" ? "" : (parseFloat(e.target.value) || 0) })}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        placeholder="0.00"
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
            asesorNombre={asesorNombre}
            asesorTelefono={asesorTelefono}
            asesorEmail={ASESOR_EMAIL}
            fecha={fechaDate}
            tiempoEntrega={tiempoEntrega}
            incluyeIva={incluyeIva}
            items={items}
          />
        </div>
      </div>
    </div>
  );
}
