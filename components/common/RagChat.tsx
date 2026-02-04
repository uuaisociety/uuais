"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Send, Loader2 } from "lucide-react";
import Image from "next/image";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: number; recommendations?: string[] };
type RateLimitInfo = { remaining: number; resetAt: string; allowed: boolean };

type Props = {
  onRecommendations?: (courseIds: string[]) => void;
  placeholder?: string;
};

export default function RagChat({ onRecommendations, placeholder = "Ask about courses..." }: Props) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const lastAssistant = useMemo(() => [...messages].reverse().find(m => m.role === "assistant"), [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, focused]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ? { uid: u.uid } : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) fetchRateLimit();
  }, [user]);

  async function fetchRateLimit() {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const res = await fetch("/api/chat", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRateLimit(await res.json());
  }

  async function send() {
    const q = value.trim();
    if (!q || !user || loading) return;
    if (rateLimit?.remaining === 0) { setError("Daily limit reached. Try again tomorrow."); return; }

    setLoading(true);
    setError(null);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q, ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setValue("");

    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.data.message,
        ts: Date.now(),
        recommendations: data.data.recommendations,
      };
      setMessages(m => [...m, assistantMsg]);
      setRateLimit(data.rateLimit);
      if (data.data.recommendations?.length && onRecommendations) onRecommendations(data.data.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (focused) {
      const el = containerRef.current?.querySelector('input');
      (el as HTMLInputElement | undefined)?.focus();
    }
  }, [focused]);

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-4">Sign in to use AI course recommendations</p>
        <Link href="/account" className="bg-[#990000] hover:bg-[#7f0000] text-white px-4 py-2 rounded-lg inline-block">Sign In</Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Chat grows upwards above the input only when focused and the user has sent at least one query  */}
      <div className={`overflow-hidden transition-all duration-450 ease-out ${focused ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-3">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">AI Course Advisor</div>
            <div className="flex items-center gap-2">
              {rateLimit && <span className="text-xs text-gray-500">{rateLimit.remaining} left today</span>}
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
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="mt-3 flex gap-2"
            >
              <Input value={value} onChange={(e)=>setValue(e.target.value)} placeholder={rateLimit?.remaining === 0 ? "Daily limit reached" : "Ask about courses, credits, level..."} fullWidth disabled={loading || rateLimit?.remaining === 0} />
              <Button type="submit" className="bg-[#990000] hover:bg-[#7f0000] text-white" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">Powered by Moonshot AI • {rateLimit?.remaining ?? '?'} requests remaining today</div>
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
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recent chat • {rateLimit?.remaining ?? '?'} left today</div>
          <div className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">{lastAssistant?.content || messages[messages.length-1]?.content}</div>
        </button>
      )}
    </div>
  );
}
