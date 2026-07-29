import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { formatMoney, type QuoteLineItem, type ServiceType } from "@/lib/quote";

const HEADER_GREEN = "#123B34";
// Logo local en public/. Coloca la imagen del logo en `public/logo-eco.png`.
const LOGO_URL = "/logo-eco.png";

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
  incluyeIva: boolean;
  items: QuoteLineItem[];
}

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

export function QuotePreview({
  tipoServicio, refCode, clienteNombre, clienteDireccion,
  asesorNombre, asesorTelefono, asesorEmail, fecha, tiempoEntrega, incluyeIva, items,
}: QuotePreviewProps) {
  // Los precios de cada línea se muestran tal cual se ingresan (subtotal).
  // Si la cotización incluye IVA, se agrega el 13% como línea aparte y se suma al total.
  const subtotal = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0);
  const iva = incluyeIva ? subtotal * 0.13 : 0;
  const total = subtotal + iva;
  const fechaFmt = format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div
      id="quote-print"
      className="quote-doc bg-white mx-auto shadow-lg flex flex-col"
      style={{ width: "800px", maxWidth: "100%", color: "#2b2b2b", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-9" style={{ background: HEADER_GREEN, color: "#fff" }}>
        <img src={LOGO_URL} alt="ECO Solutions" style={{ height: 170, objectFit: "contain" }} />
        <div className="text-right">
          <div style={{ ...serif, fontSize: 46, lineHeight: 1, letterSpacing: "0.04em" }}>COTIZACIÓN</div>
          <div className="mt-2 text-[11px] uppercase" style={{ letterSpacing: "0.28em", opacity: 0.85 }}>
            {tipoServicio} · REF. {refCode}
          </div>
        </div>
      </div>

      <div className="px-10 py-8 flex-1 flex flex-col">
        {/* Info row */}
        <div className="grid grid-cols-[1fr_1.4fr_0.95fr] gap-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] mb-2" style={{ color: HEADER_GREEN }}>PREPARADA PARA</p>
            <p className="text-[15px] font-semibold text-slate-800">{clienteNombre || "—"}</p>
            <p className="text-[13px] text-slate-500 whitespace-pre-line mt-0.5">{clienteDireccion}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] mb-2" style={{ color: HEADER_GREEN }}>ASESOR COMERCIAL</p>
            <p className="text-[15px] font-semibold text-slate-800">{asesorNombre || "—"}</p>
            <p className="text-[13px] text-slate-500 mt-0.5">{asesorTelefono}</p>
            <p className="text-[13px] text-slate-500 break-words">{asesorEmail}</p>
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

        {/* Note + totales */}
        <div className="flex justify-between items-end mt-4 gap-6">
          <p className="text-[12px] text-slate-500 leading-relaxed max-w-[55%]">
            Personal profesional a tu servicio · Personal capacitado<br />
            Productos y maquinaria especializada
          </p>
          <div className="min-w-[220px]">
            {incluyeIva && (
              <>
                <div className="flex justify-between gap-8 text-[13px] text-slate-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-8 text-[13px] text-slate-600 mt-1">
                  <span>IVA (13%)</span>
                  <span className="tabular-nums">{formatMoney(iva)}</span>
                </div>
              </>
            )}
            <div
              className={`flex justify-between gap-8 items-baseline ${incluyeIva ? "mt-2 pt-2 border-t" : ""}`}
              style={incluyeIva ? { borderColor: HEADER_GREEN } : undefined}
            >
              <span className="text-[11px] font-bold tracking-[0.18em]" style={{ color: HEADER_GREEN }}>TOTAL</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: HEADER_GREEN }}>{formatMoney(total)}</span>
            </div>
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

        {/* Signatures — ancladas al pie de la página (mt-auto empuja hacia abajo) */}
        <div className="grid grid-cols-2 gap-10 mt-auto pt-12">
          <div>
            <div className="border-t border-slate-300 pt-2">
              <p className="text-[10px] font-bold tracking-[0.18em]" style={{ color: HEADER_GREEN }}>GERENTE GENERAL</p>
              <p className="text-[13px] text-slate-600 mt-1">Maria Teresa Ramos</p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-300 pt-2">
              <p className="text-[10px] font-bold tracking-[0.18em]" style={{ color: HEADER_GREEN }}>AUTORIZACIÓN DEL SERVICIO</p>
              <p className="text-[13px] text-slate-600 mt-1">Firma del cliente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-10 py-5 text-[11px]" style={{ background: HEADER_GREEN, color: "#fff" }}>
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
