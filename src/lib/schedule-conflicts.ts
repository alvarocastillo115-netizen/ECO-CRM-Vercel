import type { CrmTask } from "@/types/crm";

// Parse "HH:MM" or "HH:MM - HH:MM" into [startMin, endMin] (minutes since midnight).
// Returns null if no usable start time. If no end is provided, treats the slot
// as a 30-minute block starting at `start` so a point-in-time entry still
// behaves like a real slot.
function parseTimeRange(timeStr: string | null | undefined): [number, number] | null {
  if (!timeStr) return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const startMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const endMin =
    m[3] != null ? parseInt(m[3], 10) * 60 + parseInt(m[4], 10) : startMin + 30;
  return [startMin, endMin];
}

interface Slot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or "HH:MM - HH:MM"
}

// Returns the first task that conflicts with the proposed slot, or null.
// A conflict is: same date AND overlapping time range on either the
// inspection slot or the service slot of any other task.
export function findScheduleConflict(
  proposed: Slot | null,
  allTasks: CrmTask[],
  excludeTaskId?: string,
): CrmTask | null {
  if (!proposed?.date) return null;
  const proposedRange = parseTimeRange(proposed.time);
  if (!proposedRange) return null;
  const [ps, pe] = proposedRange;

  for (const t of allTasks) {
    if (t.id === excludeTaskId) continue;

    const candidates: Array<{ date: string | null; time: string | undefined }> = [
      { date: t.inspection_date, time: t.inspection_time },
      { date: t.service_date, time: t.service_time },
    ];

    for (const c of candidates) {
      if (!c.date || c.date !== proposed.date) continue;
      const range = parseTimeRange(c.time);
      if (!range) continue;
      const [cs, ce] = range;
      // Standard overlap test: A starts before B ends AND B starts before A ends.
      if (ps < ce && cs < pe) {
        return t;
      }
    }
  }

  return null;
}

// Helper to build a "HH:MM - HH:MM" string from start/end inputs.
export function buildTimeString(start: string, end: string): string {
  if (!start && !end) return "";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}
