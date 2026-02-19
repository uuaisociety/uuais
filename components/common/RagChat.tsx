"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Send, Loader2, History, Trash2, Plus, MessageSquare, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { AIChat } from "@/types";
import { getUserChatsPage, saveChat, deleteChat, generateChatTitle } from "@/lib/firestore/ai-chats";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: number; recommendations?: string[] };
type RateLimitInfo = { remaining: number; resetAt: string; allowed: boolean };
type ChatError = {
  message: string;
  type: 'rate_limit' | 'api_key' | 'server' | 'network' | 'unknown';
  details?: string;
};

interface Props {
  onRecommendations?: (courseIds: string[]) => void;
  placeholder?: string;
}

export default function RagChat({ onRecommendations, placeholder = "Ask about courses..." }: Props) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const [chats, setChats] = useState<AIChat[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatsCursor, setChatsCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [chatsHasMore, setChatsHasMore] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(false);
  const chatsLoadingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  //const lastAssistant = useMemo(() => [...messages].reverse().find(m => m.role === "assistant"), [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, focused]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ? { uid: u.uid } : null));
    return () => unsub();
  }, []);

  const loadInitialChats = useCallback(async () => {
    if (!user) return;
    if (chatsLoadingRef.current) return;
    try {
      chatsLoadingRef.current = true;
      setChatsLoading(true);
      const page = await getUserChatsPage(user.uid, { pageSize: 50, cursor: null });
      setChats(page.chats);
      setChatsCursor(page.nextCursor);
      setChatsHasMore(Boolean(page.nextCursor) && page.chats.length > 0 && page.chats.length < 50);
    } catch (e) {
      console.error("Failed to load chats:", e);
    } finally {
      setChatsLoading(false);
      chatsLoadingRef.current = false;
    }
  }, [user]);

  const loadMoreChats = useCallback(async () => {
    if (!user) return;
    if (chatsLoadingRef.current) return;
    if (!chatsHasMore) return;
    if (chats.length >= 50) {
      setChatsHasMore(false);
      return;
    }
    if (!chatsCursor) {
      setChatsHasMore(false);
      return;
    }
    try {
      chatsLoadingRef.current = true;
      setChatsLoading(true);
      const page = await getUserChatsPage(user.uid, { pageSize: Math.min(50 - chats.length, 50), cursor: chatsCursor });
      setChats((prev) => {
        const existing = new Set(prev.map((c) => c.id));
        const next = [...prev];
        for (const c of page.chats) {
          if (!existing.has(c.id)) next.push(c);
        }
        return next;
      });
      setChatsCursor(page.nextCursor);
      setChatsHasMore(Boolean(page.nextCursor) && page.chats.length > 0 && chats.length + page.chats.length < 50);
    } catch (e) {
      console.error("Failed to load more chats:", e);
    } finally {
      setChatsLoading(false);
      chatsLoadingRef.current = false;
    }
  }, [user, chatsHasMore, chatsCursor, chats.length]);

  useEffect(() => {
    if (user) {
      fetchRateLimit();
      loadInitialChats();
    }
  }, [user, loadInitialChats]);

  async function fetchRateLimit() {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const res = await fetch("/api/chat", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRateLimit(await res.json());
  }

  async function send() {
    const q = value.trim();
    if (!q || !user || loading) return;
    if (rateLimit?.remaining === 0) { 
      setError({ 
        message: "Daily limit reached", 
        type: 'rate_limit',
        details: "You've used all your AI requests for today. Try again tomorrow."
      }); 
      return; 
    }

    setLoading(true);
    setError(null);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setValue("");

    try {
      const token = await auth.currentUser!.getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        let errorType: ChatError['type'] = 'unknown';
        let errorDetails: string | undefined;
        
        if (res.status === 429) {
          errorType = 'rate_limit';
          errorDetails = "You've reached the daily rate limit. Please try again tomorrow.";
        } else if (res.status === 401 || res.status === 403) {
          errorType = 'api_key';
          errorDetails = "API key error. Please check that the OpenRouter API key is configured correctly.";
        } else if (res.status >= 500) {
          errorType = 'server';
          errorDetails = "Server error. Our AI service is temporarily unavailable.";
        }
        
        throw { message: data.message || "Request failed", type: errorType, details: errorDetails } as ChatError;
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.data.message,
        ts: Date.now(),
        recommendations: data.data.recommendations,
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setRateLimit(data.rateLimit);
      if (data.data.recommendations?.length && onRecommendations) onRecommendations(data.data.recommendations);
      
      await persistChat(finalMessages, data.data.recommendations || []);
    } catch (e) {
      if (typeof e === 'object' && e && 'type' in e) {
        setError(e as ChatError);
      } else if (e instanceof Error) {
        setError({ message: e.message, type: 'network', details: "Network error. Please check your connection and try again." });
      } else {
        setError({ message: "An unexpected error occurred", type: 'unknown' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function persistChat(chatMessages: Message[], recommendations: string[] = []) {
    if (!user || chatMessages.length === 0) return;

    const title = chatMessages.length > 1
      ? generateChatTitle(chatMessages[0].content)
      : "New Chat";

    const chatData = {
      userId: user.uid,
      title,
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.ts).toISOString(),
      })),
      recommendedCourseIds: recommendations,
    };

    try {
      const chatId = await saveChat(user.uid, { ...chatData, id: currentChatId || undefined });
      if (!currentChatId) setCurrentChatId(chatId);
      await loadInitialChats();
    } catch (e) {
      console.error("Failed to save chat:", e);
    }
  }

  function clearError() {
    setError(null);
  }

  function getErrorIcon(type: ChatError['type']) {
    switch (type) {
      case 'rate_limit': return '⏱️';
      case 'api_key': return '🔑';
      case 'server': return '🔧';
      case 'network': return '📡';
      default: return '⚠️';
    }
  }

  async function loadChat(chat: AIChat) {
    setCurrentChatId(chat.id);
    const loadedMessages: Message[] = chat.messages.map((m, idx) => ({
      id: `${chat.id}-${idx}`,
      role: m.role,
      content: m.content,
      ts: new Date(m.timestamp).getTime(),
    }));
    setMessages(loadedMessages);
    if (chat.recommendedCourseIds?.length && onRecommendations) {
      onRecommendations(chat.recommendedCourseIds);
    }
    setShowSidebar(true);
    setFocused(true);
  }

  async function handleDeleteChat(chatId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) return;
    if (!confirm("Delete this chat?")) return;
    try {
      await deleteChat(user.uid, chatId);
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
      await loadInitialChats();
    } catch (e) {
      console.error("Failed to delete chat:", e);
    }
  }

  function startNewChat() {
    setCurrentChatId(null);
    setMessages([]);
    setShowSidebar(true);
    setFocused(true);
  }

  const handleLoadMoreChats = useCallback(async () => {
    await loadMoreChats();
  }, [loadMoreChats]);

  useEffect(() => {
    if (focused) {
      const el = containerRef.current?.querySelector('input');
      (el as HTMLInputElement | undefined)?.focus();
    }
  }, [focused]);

  useEffect(() => {
    console.log("Error:", error);
  }, [error]);

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
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowSidebar(!showSidebar)} className="p-1">
                <History className="h-4 w-4" />
              </Button>
              <div className="text-sm text-gray-600 dark:text-gray-300">AI Course Advisor</div>
            </div>
            <div className="flex items-center gap-2">
              {rateLimit && <span className="text-xs text-gray-500">{rateLimit.remaining} left today</span>}
              <Button size="sm" variant="outline" onClick={() => setFocused(false)}>Close</Button>
            </div>
          </div>
          <div className="max-h-[700px] min-h-[400px] flex">
            {/* Allow transition on sidebar */}
            {showSidebar && (
              <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800 transition-all duration-450 ease-out">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <Button size="sm" variant="outline" onClick={startNewChat} className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> New Chat
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                  {chats.length === 0 && !chatsLoading && (
                    <div className="text-xs text-gray-500 text-center py-4">No chat history</div>
                  )}
                  {chats.map((chat) => (
                    /* Pop on hover */
                    <div
                      key={chat.id}
                      onClick={() => loadChat(chat)}
                      className={`w-full cursor-pointer group text-left p-2 transition-colors rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-700  ${
                        currentChatId === chat.id ? 'bg-gray-200 dark:bg-gray-700' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3 w-3 text-gray-400" />
                        <div className="flex-1 truncate">{chat.title}</div>
                        <Button
                          variant="ghost"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 cursor-pointer hover:text-red-500 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {chatsLoading && (
                    <div className="text-xs text-gray-500 text-center py-2">Loading…</div>
                  )}
                  {chatsHasMore && !chatsLoading && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLoadMoreChats}
                      className="w-full mt-2"
                    >
                      Load more
                    </Button>
                  )}
                  {!chatsHasMore && chats.length > 0 && (
                    <div className="text-[11px] text-gray-400 text-center py-2">End of history</div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex-1 flex flex-col p-3">
              {showSidebar && (
                
                <Button size="sm" variant="ghost" onClick={() => setShowSidebar(false)} className="self-start mb-2">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Hide History
                </Button>
              )}
              <div ref={listRef} className="space-y-3 overflow-auto pt-5 pb-5 max-h-[500px]">
                {messages.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-300 italic">Ask anything like &quot;Bachelor&apos;s level on-campus courses with 15 credits in Uppsala&quot;</div>
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
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getErrorIcon(error.type)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-red-700 dark:text-red-300 text-sm">{error.message}</div>
                      {error.details && (
                        <div className="text-red-600 dark:text-red-400 text-xs mt-1">{error.details}</div>
                      )}
                      {error.type === 'api_key' && (
                        <div className="text-xs text-gray-500 mt-2">
                          Contact an admin to check the API configuration.
                        </div>
                      )}
                      {error.type === 'rate_limit' && rateLimit?.resetAt && (
                        <div className="text-xs text-gray-500 mt-2">
                          Resets at: {new Date(rateLimit.resetAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={clearError}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
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
          </div>
          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">LLM RAG Prototype • {rateLimit?.remaining ?? '?'} requests remaining today</div>
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
        <Button type="submit" className="bg-[#990000] hover:bg-[#7f0000] text-white transition-colors duration-100">Ask</Button>
      </form>

      {/* Docked mini-preview when closed */}
      {chats && chats.length > 0 && (
        <Button
          variant="default"
          onClick={() => { setFocused((prev) => !prev); const el = containerRef.current?.querySelector('input'); (el as HTMLInputElement | undefined)?.focus(); }}
          className="mt-3 w-full text-left px-3 pt-2 pb-1 rounded-lg transition-all duration-100 cursor-pointer  "
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recent chat • {rateLimit?.remaining ?? '?'} left today</div>
        </Button>
      )}
    </div>
  );
}
