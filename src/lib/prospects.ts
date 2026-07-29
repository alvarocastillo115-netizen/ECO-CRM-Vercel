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
