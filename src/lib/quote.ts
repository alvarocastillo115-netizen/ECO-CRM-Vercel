export const SERVICE_TYPES = [
  "SERVICIO RESIDENCIAL",
  "SERVICIO CORPORATIVO",
  "SERVICIO ENTRETENIMIENTO Y GASTRONOMÍA",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

/** Correo fijo del asesor comercial que aparece en todas las cotizaciones.
 *  Solo cambian el nombre y el teléfono del asesor; el correo es constante. */
export const ASESOR_EMAIL = "asesorcomercial1@ecosolutiossv.com";

export interface QuoteLineItem {
  id: string;
  descripcion: string;
  // Se permite "" para que el campo pueda quedar vacío en el formulario
  // (sin un 0 precargado). Al calcular totales se convierte con Number(...) || 0.
  cantidad: number | "";
  precio: number | "";
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
