import { useState } from "react";
import { ColumnId, Priority, COLUMNS } from "@/types/kanban";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultColumn: ColumnId;
  onAdd: (task: {
    title: string;
    description: string;
    priority: Priority;
    dueDate: string | null;
    columnId: ColumnId;
  }) => void;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  defaultColumn,
  onAdd,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [columnId, setColumnId] = useState<ColumnId>(defaultColumn);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      columnId,
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] shadow-panel border-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-0 shadow-card bg-surface text-sm"
              autoFocus
            />
          </div>
          <div>
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-0 shadow-card bg-surface text-sm resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="border-0 shadow-card bg-surface text-sm flex-1">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={columnId} onValueChange={(v) => setColumnId(v as ColumnId)}>
              <SelectTrigger className="border-0 shadow-card bg-surface text-sm flex-1">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border-0 shadow-card bg-surface text-sm"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!title.trim()}>
            Create Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
