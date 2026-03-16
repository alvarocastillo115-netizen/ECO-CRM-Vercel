import { useState } from "react";
import { COLUMNS, ColumnId } from "@/types/kanban";
import { useKanban } from "@/hooks/useKanban";
import { KanbanColumn } from "./KanbanColumn";
import { AddTaskDialog } from "./AddTaskDialog";
import { AIChatPanel } from "./AIChatPanel";
import { MessageSquare, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function KanbanBoard() {
  const { tasks, addTask, moveTask, deleteTask, getTasksByColumn } = useKanban();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogColumn, setDialogColumn] = useState<ColumnId>("todo");
  const [chatOpen, setChatOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    if (draggedTaskId) {
      moveTask(draggedTaskId, columnId);
      setDraggedTaskId(null);
    }
  };

  const handleAddClick = (columnId: ColumnId) => {
    setDialogColumn(columnId);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete existing tasks and insert current ones
      await supabase.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      const { error } = await supabase.from("tasks").insert(
        tasks.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          due_date: t.dueDate,
          column_id: t.columnId,
        }))
      );

      if (error) throw error;
      toast({ title: "Board saved", description: "Your tasks have been saved to the database." });
    } catch (err) {
      console.error("Save error:", err);
      toast({
        title: "Save failed",
        description: "Could not save tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Kanban Board
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tasks.length} tasks across {COLUMNS.length} columns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="shadow-card border-0 text-sm"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogColumn("todo");
                setDialogOpen(true);
              }}
              className="shadow-card border-0 text-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Task
            </Button>
            <Button
              size="sm"
              onClick={() => setChatOpen(!chatOpen)}
              className="text-sm"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              AI Assistant
            </Button>
          </div>
        </header>

        {/* Board */}
        <div className="flex-1 flex gap-4 px-6 pb-6 overflow-x-auto">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getTasksByColumn(column.id)}
              onDeleteTask={deleteTask}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onAddClick={handleAddClick}
            />
          ))}

          {/* AI Chat Panel */}
          <AIChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            tasks={tasks}
            onAddTask={(task) => addTask(task)}
          />
        </div>
      </div>

      <AddTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultColumn={dialogColumn}
        onAdd={addTask}
      />
    </div>
  );
}
