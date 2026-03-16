export type Priority = "low" | "medium" | "high" | "urgent";
export type ColumnId = "todo" | "in-progress" | "reviewed" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  columnId: ColumnId;
  createdAt: string;
}

export interface Column {
  id: ColumnId;
  title: string;
  color: string;
}

export const COLUMNS: Column[] = [
  { id: "todo", title: "To Do", color: "hsl(var(--muted-foreground))" },
  { id: "in-progress", title: "In Progress", color: "hsl(var(--warning))" },
  { id: "reviewed", title: "Reviewed", color: "hsl(var(--info))" },
  { id: "done", title: "Completed", color: "hsl(var(--success))" },
];

export const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-info/10 text-info" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive" },
};
