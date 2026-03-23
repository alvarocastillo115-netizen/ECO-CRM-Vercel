import { useState } from "react";
import { STATUS_COLUMNS, TaskStatus, CrmTask } from "@/types/crm";
import { useCrmData } from "@/hooks/useCrmData";
import { CrmKanbanColumn } from "@/components/crm/CrmKanbanColumn";
import { CreateTaskDialog } from "@/components/crm/CreateTaskDialog";
import { TaskDetailDialog } from "@/components/crm/TaskDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KanbanPage() {
  const { isAdmin } = useAuth();
  const {
    tasks, clients, categories, employees, loading,
    createTask, updateTaskStatus, updateTask, createClient, getTasksByStatus, refetch,
  } = useCrmData();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogStatus, setCreateDialogStatus] = useState<TaskStatus>("To-Do");
  const [detailTask, setDetailTask] = useState<CrmTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const handleAddClick = (status: TaskStatus) => {
    setCreateDialogStatus(status);
    setCreateDialogOpen(true);
  };

  const handleTaskClick = (task: CrmTask) => {
    setDetailTask(task);
    setDetailOpen(true);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      await updateTaskStatus(taskId, status);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tablero Kanban</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tasks.length} tareas en {STATUS_COLUMNS.length} columnas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch} className="text-sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Actualizar
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => handleAddClick("To-Do")} className="text-sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nueva Tarea
            </Button>
          )}
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 flex gap-4 px-6 py-4 overflow-x-auto">
        {STATUS_COLUMNS.map((col) => (
          <CrmKanbanColumn
            key={col.id}
            status={col.id}
            title={col.title}
            color={col.color}
            tasks={getTasksByStatus(col.id)}
            onAddClick={() => handleAddClick(col.id)}
            onTaskClick={handleTaskClick}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            isDragOver={dragOverColumn === col.id}
          />
        ))}
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clients={clients}
        categories={categories}
        employees={employees}
        defaultStatus={createDialogStatus}
        onCreateTask={createTask}
        onCreateClient={createClient}
      />

      <TaskDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        task={detailTask}
        categories={categories}
        employees={employees}
        onUpdateTask={updateTask}
        onUpdateStatus={updateTaskStatus}
      />
    </div>
  );
}
