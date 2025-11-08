"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Send } from "lucide-react";
import Image from "next/image";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: number };

type Props = {
  onSearch: (q: string) => void;
  placeholder?: string;
};

export default function RagChat({ onSearch, placeholder = "Ask about courses..." }: Props) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const lastAssistant = useMemo(() => [...messages].reverse().find(m => m.role === "assistant"), [messages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, focused]);

  useEffect(() => {
    if (focused) {
      const el = containerRef.current?.querySelector('input');
      (el as HTMLInputElement | undefined)?.focus();
    }
  }, [focused]);

  const send = () => {
    const q = value.trim();
    if (!q) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    onSearch(q);
    setValue("");
    // Animated assistant status then dummy response
    const statuses = ["Thinking...", "Searching...", "Compiling..."];
    const statusId = crypto.randomUUID();
    let idx = 0;
    setMessages((m) => [...m, { id: statusId, role: "assistant", content: statuses[idx], ts: Date.now() }]);
    const interval = setInterval(() => {
      idx = (idx + 1) % statuses.length;
      setMessages((m) => m.map((mm) => (mm.id === statusId ? { ...mm, content: statuses[idx], ts: Date.now() } : mm)));
    }, 600);
    setTimeout(() => {
      clearInterval(interval);
      const suggestion = `Here are some matches for: \"${q}\". Try filters like level, location or credits. (demo)`;
      setMessages((m) => m.map((mm) => (mm.id === statusId ? { ...mm, content: suggestion, ts: Date.now() } : mm)));
    }, 2200);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Chat grows upwards above the input only when focused and the user has sent at least one query  */}
      <div className={`overflow-hidden transition-all duration-450 ease-out ${focused ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-3">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">RAG Chat (demo)</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setFocused(false)}>Close</Button>
            </div>
          </div>
          <div className="max-h-[700px] min-h-[400px] p-3 flex flex-col">
            <div ref={listRef} className="space-y-3 overflow-auto pt-5 pb-5 max-h-[500px]">
              {messages.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-300">Ask anything like &quot;Bachelor&apos;s level on-campus courses with 15 credits in Uppsala&quot;</div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                  {m.role === "assistant" && (
                    <Image src="/images/logo.png" alt="AI" width={40} height={50} className="rounded-sm opacity-80" />
                  )}
                  <div className={`${m.role === "user" ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"} px-3 py-2 rounded-lg max-w-[80%] text-sm shadow-sm`}>{m.content}</div>
                </div>
              ))}
            </div>
            {/* Fill space between messages and chat input */}
            <div className="flex-1"></div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="mt-3 flex gap-2"
            >
              <Input value={value} onChange={(e)=>setValue(e.target.value)} placeholder="Ask about courses, credits, level..." fullWidth />
              <Button type="submit" className="bg-[#990000] hover:bg-[#7f0000] text-white" aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">Responses are mock. AI integration coming soon.</div>
        </div>
      </div>

      {/* Input visible at the bottom only when not focused; focusing expands the chat above */}
      <form
        onSubmit={(e) => { e.preventDefault(); setFocused(true); send(); }}
        className="flex gap-3 w-full"
        style={{ display: focused ? "none" : "flex" }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          fullWidth
        />
        <Button type="submit" className="bg-[#990000] hover:bg-[#7f0000] text-white">Ask</Button>
      </form>

      {/* Docked mini-preview when closed */}
      {!focused && (messages.length > 0) && (
        <button
          onClick={() => { setFocused(true); const el = containerRef.current?.querySelector('input'); (el as HTMLInputElement | undefined)?.focus(); }}
          className="mt-3 w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recent chat</div>
          <div className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">{lastAssistant?.content || messages[messages.length-1]?.content}</div>
        </button>
      )}
    </div>
  );
}
