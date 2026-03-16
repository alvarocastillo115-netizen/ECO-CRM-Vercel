import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles, CheckCircle2, Pencil, Plus } from "lucide-react";
import { Task, ColumnId, Priority } from "@/types/kanban";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: TaskAction[];
}

interface TaskAction {
  type: "create" | "edit";
  taskId?: string;
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  columnId?: ColumnId;
  applied?: boolean;
}

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onAddTask: (task: { title: string; description: string; priority: Priority; dueDate: string | null; columnId: ColumnId }) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

function parseActions(content: string): { cleanContent: string; actions: TaskAction[] } {
  const actions: TaskAction[] = [];
  const actionRegex = /```task-action\n([\s\S]*?)```/g;
  let match;

  while ((match = actionRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        actions.push(...parsed);
      } else {
        actions.push(parsed);
      }
    } catch (e) {
      console.warn("Failed to parse task action:", e);
    }
  }

  const cleanContent = content.replace(/```task-action\n[\s\S]*?```/g, "").trim();
  return { cleanContent, actions };
}

function ActionButton({ action, onApply }: { action: TaskAction; onApply: () => void }) {
  if (action.applied) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success text-xs font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {action.type === "create" ? `Created "${action.title}"` : `Updated "${action.title}"`}
      </div>
    );
  }

  return (
    <button
      onClick={onApply}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors w-full text-left"
    >
      {action.type === "create" ? (
        <Plus className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
      )}
      <span className="truncate">
        {action.type === "create"
          ? `Create: "${action.title}"`
          : `Edit: "${action.title}"${action.priority ? ` → ${action.priority}` : ""}${action.columnId ? ` → ${action.columnId}` : ""}`}
      </span>
    </button>
  );
}

export function AIChatPanel({ open, onClose, tasks, onAddTask, onUpdateTask }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your task assistant. I can **see your board**, **create new tasks**, and **edit existing ones**. Try:\n- \"Create a task for writing unit tests\"\n- \"Change the priority of Build API to medium\"\n- \"Break down Design system into subtasks\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const buildTaskContext = () => {
    const taskSummary = tasks
      .map(
        (t) =>
          `- [id:${t.id}] [${t.columnId}] "${t.title}" (${t.priority} priority${t.dueDate ? `, due ${t.dueDate}` : ""})${t.description ? ` — ${t.description}` : ""}`
      )
      .join("\n");
    return `Current board tasks:\n${taskSummary || "(no tasks)"}`;
  };

  const applyAction = (msgIndex: number, actionIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.actions) return;
    const action = msg.actions[actionIndex];

    if (action.type === "create" && action.title) {
      onAddTask({
        title: action.title,
        description: action.description || "",
        priority: action.priority || "medium",
        dueDate: action.dueDate ?? null,
        columnId: action.columnId || "todo",
      });
      toast({ title: "Task created", description: `"${action.title}" added to the board.` });
    } else if (action.type === "edit" && action.taskId) {
      const updates: Partial<Task> = {};
      if (action.title) updates.title = action.title;
      if (action.description !== undefined) updates.description = action.description;
      if (action.priority) updates.priority = action.priority;
      if (action.dueDate !== undefined) updates.dueDate = action.dueDate;
      if (action.columnId) updates.columnId = action.columnId;
      onUpdateTask(action.taskId, updates);
      toast({ title: "Task updated", description: `"${action.title || "Task"}" has been updated.` });
    }

    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex || !m.actions) return m;
        return {
          ...m,
          actions: m.actions.map((a, j) =>
            j === actionIndex ? { ...a, applied: true } : a
          ),
        };
      })
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful task management AI assistant. You can see the user's Kanban board and provide actionable advice. Be concise and direct. Use markdown formatting.

IMPORTANT — You can CREATE and EDIT tasks. When the user asks you to create or modify tasks, include a task-action code block in your response with the JSON. The frontend will parse this and show action buttons.

For CREATING tasks, use:
\`\`\`task-action
{"type":"create","title":"Task title","description":"Description","priority":"medium","columnId":"todo","dueDate":"2026-03-20"}
\`\`\`

For EDITING existing tasks, use the task's id from the board context:
\`\`\`task-action
{"type":"edit","taskId":"<id>","title":"Updated title","priority":"high","columnId":"in-progress"}
\`\`\`

You can include multiple actions as an array. Only include the fields that need changing for edits. Valid priorities: low, medium, high, urgent. Valid columns: todo, in-progress, reviewed, done.

Always explain what you're doing in natural language alongside the action blocks.

${buildTaskContext()}`,
    };

    const allMessages = [
      systemMessage,
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMsg.content },
    ];

    try {
      const resp = await supabase.functions.invoke("ai-chat", {
        body: { messages: allMessages },
      });

      if (resp.error) throw resp.error;

      const data = resp.data;
      if (data?.choices?.[0]?.message?.content) {
        const raw = data.choices[0].message.content;
        const { cleanContent, actions } = parseActions(raw);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: cleanContent, actions: actions.length > 0 ? actions : undefined },
        ]);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e) {
      console.error("AI chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="w-[340px] flex-shrink-0 bg-card shadow-panel rounded-xl flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[85%] space-y-2">
              <div
                className={`rounded-xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.actions && msg.actions.length > 0 && (
                <div className="space-y-1.5">
                  {msg.actions.map((action, j) => (
                    <ActionButton
                      key={j}
                      action={action}
                      onApply={() => applyAction(i, j)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface rounded-xl px-3.5 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-1.5">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask, create, or edit tasks..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-md text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
