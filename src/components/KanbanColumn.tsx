import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Column, ColumnId, Task } from "@/types/kanban";
import { TaskCard } from "./TaskCard";
import { Plus } from "lucide-react";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDrop: (e: React.DragEvent, columnId: ColumnId) => void;
  onAddClick: (columnId: ColumnId) => void;
}

export function KanbanColumn({
  column,
  tasks,
  onDeleteTask,
  onDragStart,
  onDrop,
  onAddClick,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(e, column.id);
  };

  return (
    <div
      className={`flex flex-col min-w-[280px] w-[280px] flex-shrink-0 rounded-xl transition-colors duration-200 ${
        isDragOver ? "bg-primary/5" : "bg-surface"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-md text-2xs font-semibold tabular-nums"
            style={{
              backgroundColor: column.color + "18",
              color: column.color,
            }}
          >
            {tasks.length}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {column.title}
          </span>
        </div>
        <button
          onClick={() => onAddClick(column.id)}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
              onDragStart={onDragStart}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
