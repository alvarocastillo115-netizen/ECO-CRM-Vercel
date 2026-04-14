import { CrmTask, TaskStatus } from "@/types/crm";
import { CrmTaskCard } from "./CrmTaskCard";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrmKanbanColumnProps {
  status: TaskStatus;
  title: string;
  color: string;
  tasks: CrmTask[];
  onAddClick: () => void;
  onTaskClick: (task: CrmTask) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
}

export function CrmKanbanColumn({
  status,
  title,
  color,
  tasks,
  onAddClick,
  onTaskClick,
  onDragOver,
  onDrop,
  isDragOver,
}: CrmKanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] w-[280px] flex-shrink-0 rounded-xl transition-colors duration-200",
        isDragOver ? "brightness-95" : ""
      )}
      style={{
        background: `linear-gradient(to bottom, ${color}66 0%, ${color}05 100%)`
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Column top border */}
      <div className="h-1 rounded-t-xl" style={{ backgroundColor: color }} />

      {/* Column header */}
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-md text-2xs font-bold tabular-nums"
            style={{ backgroundColor: `${color}30`, color: color === "#FFF293" || color === "#C9DC92" ? "#666" : color }}
          >
            {tasks.length}
          </span>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <button
          onClick={onAddClick}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] kanban-scroll-area">
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("taskId", task.id);
              e.dataTransfer.effectAllowed = "move";
            }}
          >
            <CrmTaskCard task={task} columnColor={color} onClick={() => onTaskClick(task)} />
          </div>
        ))}
      </div>
    </div>
  );
}
