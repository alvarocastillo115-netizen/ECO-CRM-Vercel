import { useState, useCallback } from "react";
import { Task, ColumnId } from "@/types/kanban";

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "Design system architecture",
    description: "Define component hierarchy and design tokens for the new product",
    priority: "high",
    dueDate: "2026-03-20",
    columnId: "todo",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Build API endpoints",
    description: "Create REST endpoints for task CRUD operations",
    priority: "urgent",
    dueDate: "2026-03-18",
    columnId: "in-progress",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "User flow wireframes",
    description: "Create wireframes for the onboarding experience",
    priority: "medium",
    dueDate: "2026-03-22",
    columnId: "reviewed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    title: "Setup CI/CD pipeline",
    description: "Configure GitHub Actions for automated testing and deployment",
    priority: "low",
    dueDate: null,
    columnId: "done",
    createdAt: new Date().toISOString(),
  },
];

export function useKanban() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const addTask = useCallback((task: Omit<Task, "id" | "createdAt">) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  }, []);

  const moveTask = useCallback((taskId: string, toColumn: ColumnId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId: toColumn } : t))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  }, []);

  const getTasksByColumn = useCallback(
    (columnId: ColumnId) => tasks.filter((t) => t.columnId === columnId),
    [tasks]
  );

  return { tasks, addTask, moveTask, deleteTask, updateTask, getTasksByColumn };
}
