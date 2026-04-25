"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Send, Loader2, Trash2, Plus, MessageSquare, ExternalLink, Bug, History } from "lucide-react";
import Image from "next/image";
import { auth } from "@/lib/firebase-client";
import Link from "next/link";
import { AIChat } from "@/types";
import { getUserChatsPage, saveChat, deleteChat, generateChatTitle } from "@/lib/firestore/ai-chats";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useAdmin } from "@/hooks/useAdmin";
import type { Course } from "@/lib/courses";

type Message = { id: string; role: "user" | "assistant"; content: string; ts: number; recommendations?: string[] };
type RateLimitInfo = { remaining: number; resetAt: string; allowed: boolean };
type ChatError = {
  message: string;
  type: 'rate_limit' | 'api_key' | 'server' | 'network' | 'unknown';
  details?: string;
};

type ChatDebugInfo = {
  model: string;
  retrievalQuery: string;
  keywords: string[];
  allowedCourseIds: string[];
  candidateCourses: Array<{ id: string; code: string; title: string }>;
  promptMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  rawModelContent: string;
  parsedResponse: { message: string; recommendations: string[] };
  parsedRecommendations: string[];
  normalizedRecommendations: string[];
};

function createMessageTimestamp() {
  return Date.now();
}

interface Props {
  onRecommendations?: (courseIds: string[]) => void;
  onThinkingStart?: () => void;
  placeholder?: string;
}

export default function RagChat({ onRecommendations, onThinkingStart, placeholder = "Ask about courses..." }: Props) {
  const [focused, setFocused] = useState(true);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const [debugInfo, setDebugInfo] = useState<ChatDebugInfo | null>(null);
  const [chats, setChats] = useState<AIChat[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatsCursor, setChatsCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [chatsHasMore, setChatsHasMore] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const chatsLoadingRef = useRef(false);
  const hasRestoredLatestChatRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin, loading: userLoading } = useAdmin();
  const [courseCache, setCourseCache] = useState<Map<string, Course>>(new Map());
  //const lastAssistant = useMemo(() => [...messages].reverse().find(m => m.role === "assistant"), [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, focused]);


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
      if (page.chats.length === 0) {
        hasRestoredLatestChatRef.current = true;
      }
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
    async function init() {
      if(userLoading) return;
      if (user) {
        // Set auth cookies via /api/login for next-firebase-auth-edge
        const token = await auth.currentUser?.getIdToken(true);
        if (token) {
          // next-firebase-auth-edge expects the Firebase idToken in the Authorization header.
          const loginRes = await fetch("/api/login", {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          if (!loginRes.ok) {
            const body = await loginRes.text().catch(() => "");
            console.error("Failed to set auth cookies via /api/login", {
              status: loginRes.status,
              body,
            });
          }
          // Fetch rate limit - auth is now cookie-based
          const res = await fetch("/api/chat", { credentials: "include" });
          if (res.ok) setRateLimit(await res.json());
        }
        loadInitialChats();
      }
    }
    init();
  }, [user,userLoading, loadInitialChats]);

  const fetchRecommendedCourses = useCallback(async (courseIds: string[]) => {
    if (!user) return;
    
    // Filter out courses we already have in cache
    const uncachedIds = courseIds.filter(id => !courseCache.has(id));
    if (uncachedIds.length === 0) return;
    
    try {
      // Auth is handled via cookies by next-firebase-auth-edge middleware
      const res = await fetch('/api/courses/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: uncachedIds }),
      });
      
      if (res.ok) {
        const { courses } = await res.json();
        setCourseCache(prev => {
          const newCache = new Map(prev);
          courses.forEach((course: Course) => {
            newCache.set(course.id, course);
          });
          return newCache;
        });
      }
    } catch (e) {
      console.error('Failed to fetch recommended courses:', e);
    }
  }, [user, courseCache]);

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
    onThinkingStart?.();
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q, ts: createMessageTimestamp() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setValue("");

    try {
      // Auth is handled via cookies by next-firebase-auth-edge middleware
      // Include conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ query: q, conversationHistory }),
      });

      const data = await res.json();
      if (!res.ok) {
        let errorType: ChatError['type'] = 'unknown';
        let errorMessage = "Something went wrong. Please try again.";
        let errorDetails: string | undefined;
        
        if (res.status === 429) {
          errorType = 'rate_limit';
          errorMessage = "Daily limit reached";
          errorDetails = "You've reached the daily rate limit. Please try again tomorrow.";
        } else if (res.status === 401 || res.status === 403) {
          errorType = 'api_key';
          errorMessage = "AI service configuration issue";
          errorDetails = "The AI service is not configured correctly. Please contact an admin.";
        } else if (res.status >= 500) {
          errorType = 'server';
          errorMessage = "AI service temporarily unavailable";
          errorDetails = "Please try again in a moment.";
        }
        
        throw { message: errorMessage, type: errorType, details: errorDetails } as ChatError;
      }

      setDebugInfo(data.debug ?? null);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.data.message,
        ts: createMessageTimestamp(),
        recommendations: data.data.recommendations,
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setRateLimit(data.rateLimit);
      if (data.data.recommendations?.length && onRecommendations) onRecommendations(data.data.recommendations);
      
      // Fetch course details for recommendations
      if (data.data.recommendations?.length) {
        await fetchRecommendedCourses(data.data.recommendations);
      }
      
      await persistChat(finalMessages, data.data.recommendations || []);
    } catch (e) {
      if (typeof e === 'object' && e && 'type' in e) {
        setError(e as ChatError);
      } else if (e instanceof Error) {
        setError({ message: "Connection problem", type: 'network', details: "Please check your internet connection and try again." });
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
        recommendations: m.recommendations,
      })),
      recommendedCourseIds: Array.from(new Set(chatMessages.flatMap((message) => message.recommendations || recommendations))),
    } as AIChat;

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

  const loadChat = useCallback(async (chat: AIChat) => {
    setCurrentChatId(chat.id);
    setDebugInfo(null);
    const loadedMessages: Message[] = chat.messages.map((m, idx) => ({
      id: `${chat.id}-${idx}`,
      role: m.role,
      content: m.content,
      ts: new Date(m.timestamp).getTime(),
      recommendations: m.recommendations || (m.role === 'assistant' && idx > 0 ? chat.recommendedCourseIds : undefined),
    }));
    setMessages(loadedMessages);
    const latestRecommendations =
      [...loadedMessages].reverse().find((message) => message.role === "assistant" && message.recommendations?.length)?.recommendations ||
      chat.recommendedCourseIds;
    if (latestRecommendations?.length && onRecommendations) {
      onRecommendations(latestRecommendations);
      // Fetch course details for loaded chat
      await fetchRecommendedCourses(latestRecommendations);
    }
    setFocused(true);
  }, [fetchRecommendedCourses, onRecommendations]);

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
    setDebugInfo(null);
    hasRestoredLatestChatRef.current = true;
    setFocused(true);
  }

  const handleCopyDebug = useCallback(async () => {
    if (!debugInfo) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    } catch (error) {
      console.error("Failed to copy debug info:", error);
    }
  }, [debugInfo]);

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
    hasRestoredLatestChatRef.current = false;
  }, [user?.uid]);

  useEffect(() => {
    if (hasRestoredLatestChatRef.current) {
      return;
    }
    if (chats.length === 0 || currentChatId || messages.length > 0) {
      return;
    }

    hasRestoredLatestChatRef.current = true;
    queueMicrotask(() => {
      void loadChat(chats[0]);
    });
  }, [chats, currentChatId, loadChat, messages.length]);

  if(userLoading){
    return <div className="pt-24 px-4 max-w-5xl mx-auto text-gray-700 dark:text-gray-200">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-4">Sign in to use AI course recommendations</p>
        <Link href="/account" className="bg-[#990000] hover:bg-[#7f0000] text-white px-4 py-2 rounded-lg inline-block">Sign In</Link>
      </div>
    );
  }
  console.log("chats", chats);
  return (
    <div ref={containerRef} className="relative">
      {/* Chat grows upwards above the input only when focused and the user has sent at least one query  */}
      <div className={`overflow-hidden transition-all duration-450 ease-out ${focused ? "max-h-[700px] opacity-100 p-0" : "max-h-0 opacity-0"}`}>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">AI Course Advisor</div>
              <button
                type="button"
                onClick={() => setShowSidebar((prev) => !prev)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title={showSidebar ? "Hide chat history" : "Show chat history"}
                aria-label={showSidebar ? "Hide chat history" : "Show chat history"}
              >
                <History className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {rateLimit && rateLimit.remaining <= 3 && <span className="text-xs text-gray-500">{rateLimit.remaining} left today</span>}
            </div>
          </div>
          <div className="max-h-[600px] min-h-[400px] flex flex-col md:flex-row">
            {showSidebar && (
              <div className="md:w-64 md:min-w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <Button size="sm" onClick={startNewChat} className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> New Chat
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                  {chats.length === 0 && !chatsLoading && (
                    <div className="text-xs text-gray-500 text-center py-4">No chat history</div>
                  )}
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => loadChat(chat)}
                      className={`w-full cursor-pointer group text-left p-2 transition-colors rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-700 ${
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
              <div ref={listRef} className="space-y-3 overflow-auto pt-5 pb-5 max-h-[500px]">
                {messages.length === 0 && (<div className="flex flex-col items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-300 italic">Ask about anything related to course selection, e.g "Find me courses covering machine learning and LLMs"</div>
                </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className="flex flex-col gap-2">
                    <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {m.role === "assistant" && (
                        <Image src="/images/logo.png" alt="AI" width={40} height={50} className="rounded-sm opacity-80" />
                      )}
                      <div className={`${m.role === "user" ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"} px-3 py-2 rounded-lg max-w-[80%] text-sm shadow-sm`}>{m.content}</div>
                    </div>
                    {m.role === "assistant" && m.recommendations && m.recommendations.length > 0 && (
                      <div className="ml-12 space-y-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Recommended courses:</div>
                        {m.recommendations.map((courseId) => {
                          const course = courseCache.get(courseId);
                          if (!course) return null;
                          return (
                            <Link
                              key={`${m.id}-${courseId}`}
                              href={`/explore/${courseId}`}
                              className="block group"
                            >
                              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-[#990000] dark:hover:border-[#990000] transition-all cursor-pointer shadow-sm hover:shadow-md">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {course.level && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{course.level}</span>
                                      )}
                                      {course.credits && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{course.credits} credits</span>
                                      )}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-[#990000] transition-colors">
                                      {course.title} - {course.code || course.id}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                      {course.description}
                                    </div>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-[#990000] transition-colors shrink-0 mt-1" />
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {/* If loading response show "Thinking..." with animated dots*/}
                {loading && (
                  <div className={`flex items-center gap-2`}>
                    <Image src="/images/logo.png" alt="AI" width={40} height={50} className="rounded-sm opacity-80" />
                    <div className="flex items-center justify-center pt-2">
                      {/* Animated dots */}
                      <div className="flex items-center space-x-1 font-medium text-gray-600 dark:text-gray-400 animate-pulse">
                        <span>Thinking</span>
                        <div className="flex pt-2">
                          <span className="ml-1 thinking-dot [animation-delay:800ms]">.</span>
                          <span className="thinking-dot [animation-delay:1000ms]">.</span>
                          <span className="thinking-dot [animation-delay:1200ms]">.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
              {isAdmin && debugInfo && (
                <details className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-amber-900 dark:text-amber-200">
                    <span className="inline-flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Admin Debug
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      {debugInfo.model} • {debugInfo.normalizedRecommendations.length} normalized IDs
                    </span>
                  </summary>
                  <div className="border-t border-amber-200 dark:border-amber-800 px-4 py-3 space-y-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={handleCopyDebug}>
                        Copy Debug JSON
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 text-xs text-gray-700 dark:text-gray-200">
                      <div>
                        <div className="font-semibold mb-1">Parsed response</div>
                        <pre className="whitespace-pre-wrap rounded bg-white/70 dark:bg-gray-950/40 p-2">{JSON.stringify(debugInfo.parsedResponse, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Normalized recommendations</div>
                        <pre className="whitespace-pre-wrap rounded bg-white/70 dark:bg-gray-950/40 p-2">{JSON.stringify(debugInfo.normalizedRecommendations, null, 2)}</pre>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Retrieval query</div>
                        <pre className="whitespace-pre-wrap rounded bg-white/70 dark:bg-gray-950/40 p-2">{debugInfo.retrievalQuery}</pre>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Keywords</div>
                        <pre className="whitespace-pre-wrap rounded bg-white/70 dark:bg-gray-950/40 p-2">{JSON.stringify(debugInfo.keywords, null, 2)}</pre>
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-200">
                      <div className="font-semibold mb-1">Candidate courses</div>
                      <pre className="whitespace-pre-wrap rounded bg-white/70 dark:bg-gray-950/40 p-2 max-h-40 overflow-auto">{JSON.stringify(debugInfo.candidateCourses, null, 2)}</pre>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-200">
                      <div className="font-semibold mb-1">Prompt messages</div>
                      <pre className="whitespace-pre-wrap rounded bg-white/70 dark:bg-gray-950/40 p-2 max-h-56 overflow-auto">{JSON.stringify(debugInfo.promptMessages, null, 2)}</pre>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-200">
                      <div className="font-semibold mb-1">Raw model content</div>
                      <pre className="whitespace-pre-wrap rounded bg-white/70 dark:bg-gray-950/40 p-2 max-h-56 overflow-auto">{debugInfo.rawModelContent || "[empty]"}</pre>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">RAG Prototype{rateLimit && rateLimit.remaining <= 3 && ` • ${rateLimit.remaining} requests remaining today`}</div>
        </div>
      </div>

      {/* Input visible at the bottom only when not focused; focusing expands the chat above */}
      <form
        onSubmit={(e) => { e.preventDefault(); startNewChat(); setFocused(true); send(); }}
        className="flex gap-2 w-full"
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

    </div>
  );
}
