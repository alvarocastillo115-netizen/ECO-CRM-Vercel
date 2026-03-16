import { motion } from "framer-motion";
import { Task, PRIORITY_CONFIG } from "@/types/kanban";
import { Calendar, GripVertical, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export function TaskCard({ task, onDelete, onDragStart }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, task.id)}
      className="group relative bg-card rounded-xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing"
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-medium ${priority.className}`}
          >
            {priority.label}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>

        <h3 className="text-sm font-medium text-foreground mb-1 leading-snug" style={{ textWrap: "balance" } as React.CSSProperties}>
          {task.title}
        </h3>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">
            {task.description}
          </p>
        )}

        {task.dueDate && (
          <div className="flex items-center gap-1.5 text-2xs text-muted-foreground tabular-nums">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.dueDate), "MMM d, yyyy")}
          </div>
        )}
      </div>
    </motion.div>
  );
}
