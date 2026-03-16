import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Sparkles } from "lucide-react";
import { Task } from "@/types/kanban";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onAddTask: (task: { title: string; description: string; priority: "low" | "medium" | "high" | "urgent"; dueDate: string | null; columnId: "todo" }) => void;
}

export function AIChatPanel({ open, onClose, tasks, onAddTask }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your task assistant. I can see your board and help break down tasks, suggest priorities, or answer questions. Try asking me to **break down a task** or **suggest what to work on next**.",
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
          `- [${t.columnId}] "${t.title}" (${t.priority} priority${t.dueDate ? `, due ${t.dueDate}` : ""})`
      )
      .join("\n");
    return `Current board tasks:\n${taskSummary || "(no tasks)"}`;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";

    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful task management AI assistant. You can see the user's Kanban board and provide actionable advice. Be concise and direct. Use markdown formatting. When suggesting task breakdowns, format them as bullet points.

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

      // Non-streaming response
      const data = resp.data;
      if (data?.choices?.[0]?.message?.content) {
        assistantSoFar = data.choices[0].message.content;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantSoFar },
        ]);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e) {
      console.error("AI chat error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
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
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
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
            placeholder="Ask about your tasks..."
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
