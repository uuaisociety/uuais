"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldGroup, InputBase, SelectBase, TextareaBase } from "@/components/ui/Form";
import Tag from "@/components/ui/Tag";
import { Loader2, Sparkles, RefreshCw, ExternalLink } from "lucide-react";
import DOMPurify from "dompurify";
import { useApp } from "@/contexts/AppContext";
import type { NewsItem, BlogPostType } from "@/lib/ai/blog/types";

/** Extract the current (possibly partial) value of a string field from the streaming JSON. */
function extractJsonStringValue(raw: string, key: string): string | undefined {
  const re = new RegExp(`"${key}"\\s*:\\s*"`);
  const match = re.exec(raw);
  if (!match || match.index === undefined) return undefined;
  const cursor = raw.slice(match.index + match[0].length);
  let out = "";
  let escaped = false;
  for (let i = 0; i < cursor.length; i++) {
    const ch = cursor[i];
    if (escaped) {
      out += "\\" + ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') break;
    out += ch;
  }
  return out;
}

function unescapeJsonValue(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  }
}

interface GenerateBlogModalProps {
  open: boolean;
  onClose: () => void;
  onDraftCreated: (draftId: string) => void;
}

const POST_TYPE_OPTIONS: { value: BlogPostType; label: string }[] = [
  { value: "weekly-digest", label: "Weekly Digest" },
  { value: "event-preview", label: "Event Preview" },
  { value: "event-recap", label: "Event Recap" },
];

const formatDate = (s?: string) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : format(d, "MMM d, yyyy");
};

const GenerateBlogModal: React.FC<GenerateBlogModalProps> = ({ open, onClose, onDraftCreated }) => {
  const { state } = useApp();
  const [candidates, setCandidates] = useState<NewsItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [type, setType] = useState<BlogPostType>("weekly-digest");
  const [autoPick, setAutoPick] = useState(true);
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Live streaming state
  const [streaming, setStreaming] = useState(false);
  const [streamReasoning, setStreamReasoning] = useState("");
  const [streamContent, setStreamContent] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [streamRaw, setStreamRaw] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Live styled preview of the article as the model writes it.
  const preview = useMemo(() => {
    const raw = streamContent;
    if (!raw) return { title: "", excerpt: "", contentHtml: "" };
    const title = extractJsonStringValue(raw, "title");
    const excerpt = extractJsonStringValue(raw, "excerpt");
    const contentHtml = extractJsonStringValue(raw, "contentHtml");
    return {
      title: title ? unescapeJsonValue(title) : "",
      excerpt: excerpt ? unescapeJsonValue(excerpt) : "",
      contentHtml: contentHtml ? unescapeJsonValue(contentHtml) : "",
    };
  }, [streamContent]);

  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streamContent, streamReasoning, streamStatus]);

  const fetchCandidates = useCallback(async (q?: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/blog/news-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q?.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFetchError(data.message || "Failed to fetch news candidates");
        return;
      }
      setCandidates(data.candidates || []);
      setWarnings(data.warnings || []);
    } catch {
      setFetchError("Failed to fetch news candidates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setCandidates([]);
    setSelectedIds({});
    setQuery("");
    setType("weekly-digest");
    setAutoPick(true);
    setEventId("");
    setNotes("");
    setWarnings([]);
    setFetchError(null);
    setSubmitError(null);
    setStreaming(false);
    setStreamReasoning("");
    setStreamContent("");
    setStreamStatus("");
    setStreamRaw("");
    setShowRaw(false);
    setElapsed(0);
    fetchCandidates();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, fetchCandidates]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setEventId("");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [type]);

  const eventsForType = useMemo(() => {
    if (type === "event-preview") {
      return state.events.filter((e) => e.status === "upcoming");
    }
    if (type === "event-recap") {
      return state.events.filter((e) => e.status === "past");
    }
    return [];
  }, [type, state.events]);

  const selectedItems = candidates.filter((c) => selectedIds[c.id]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerate = async () => {
    setSubmitError(null);
    if (type === "weekly-digest" && !autoPick && selectedItems.length === 0) {
      setSubmitError("Select at least one news item, or let the AI pick the top stories");
      return;
    }
    if ((type === "event-preview" || type === "event-recap") && !eventId) {
      setSubmitError(`Select an event for a ${type.replace("-", " ")}`);
      return;
    }
    if (type === "event-recap" && !notes.trim()) {
      setSubmitError("Add admin notes about what happened at the event");
      return;
    }

    setGenerating(true);
    setStreaming(true);
    setStreamReasoning("");
    setStreamContent("");
    setStreamStatus("Starting…");
    setStreamRaw("");
    setElapsed(0);

    abortRef.current = new AbortController();
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const res = await fetch("/api/admin/blog/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          type,
          autoPick: type === "weekly-digest" ? autoPick : false,
          selectedItems: autoPick ? [] : selectedItems,
          notes: notes.trim() || undefined,
          eventId: eventId || undefined,
        }),
      });
      if (!res.ok || !res.body) {
        if (abortRef.current?.signal.aborted) return;
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.message || "Failed to start generation");
        return;
      }

      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const rawEvent of events) {
          const line = rawEvent.trim();
          if (!line.startsWith("data:")) continue;
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          switch (data.type) {
            case "reasoning":
              setStreamReasoning((prev) => prev + String(data.text ?? ""));
              break;
            case "delta":
              setStreamContent((prev) => prev + String(data.text ?? ""));
              break;
            case "status":
              setStreamStatus(String(data.text ?? ""));
              break;
            case "done":
              onDraftCreated(String(data.draftId));
              return;
            case "error":
              setStreamRaw(String(data.raw ?? ""));
              setShowRaw(true);
              setSubmitError(String(data.message ?? "Generation failed"));
              return;
          }
        }
      }
    } catch {
      if (!abortRef.current?.signal.aborted) {
        setSubmitError("Failed to generate draft");
      }
    } finally {
      window.clearInterval(timer);
      reader?.cancel().catch(() => {});
      abortRef.current = null;
      setStreaming(false);
      setGenerating(false);
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    setStreamStatus("Stopped by admin.");
  };

  const showConsole = streaming || streamContent || streamReasoning || streamStatus || streamRaw;

  return (
    <Modal
      open={open}
      onClose={() => { abortRef.current?.abort(); onClose(); }}
      title="Generate AI Draft"
      size="lg"
    >
      <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Drafts are created unpublished and must be reviewed before publishing.
        </p>

        <FieldGroup label="Post type" requiredHint="Required.">
          <SelectBase value={type} onChange={(e) => setType(e.target.value as BlogPostType)}>
            {POST_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </SelectBase>
        </FieldGroup>

        {type === "weekly-digest" && (
          <label className="flex items-start gap-3 p-3 rounded-md border border-border bg-foreground/[0.02] cursor-pointer">
            <input
              type="checkbox"
              checked={autoPick}
              onChange={(e) => setAutoPick(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">Let the AI pick the top stories</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                The agent scans the curated news sources and selects the most significant stories itself. Uncheck to choose the stories manually below.
              </span>
            </span>
          </label>
        )}

        {type !== "weekly-digest" && (
          <FieldGroup label={type === "event-preview" ? "Upcoming event" : "Past event"} requiredHint="Required.">
            <SelectBase value={eventId} onChange={(e) => setEventId(e.target.value)} required>
              <option value="">Select an event...</option>
              {eventsForType.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </SelectBase>
          </FieldGroup>
        )}

        {type === "weekly-digest" && (
          <div>
            <div className="flex gap-2 mb-3">
              <InputBase
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Custom search (optional)"
              />
              <Button type="button" variant="outline" icon={RefreshCw} onClick={() => fetchCandidates(query)} disabled={loading}>
                Search
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : fetchError ? (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg flex items-center justify-between gap-3">
                <span>{fetchError}</span>
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => fetchCandidates(query)}>Retry</Button>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No news candidates found.</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {candidates.map((c) => {
                  const selected = !!selectedIds[c.id];
                  return (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-foreground/[0.03] transition-colors">
                      <input
                        type="checkbox"
                        id={`cand-${c.id}`}
                        checked={selected}
                        onChange={() => toggleSelect(c.id)}
                        className="mt-1 accent-primary"
                      />
                      <label htmlFor={`cand-${c.id}`} className="flex-1 min-w-0 cursor-pointer">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Tag variant="gray" size="sm">{c.source}</Tag>
                          {formatDate(c.publishedAt) && (
                            <span className="text-xs text-muted-foreground">{formatDate(c.publishedAt)}</span>
                          )}
                        </div>
                        <span className="mt-1 flex items-start gap-1 text-sm font-medium text-foreground">
                          {c.title}
                        </span>
                        {c.snippet && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.snippet}</p>}
                      </label>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open article: ${c.title}`}
                        className="mt-1 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {warnings.length > 0 && (
              <ul className="mt-3 text-xs text-muted-foreground list-disc pl-4 space-y-1">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}

        <FieldGroup label="Admin notes / what happened" requiredHint={type === "event-recap" ? "Required." : "Optional."}>
          <TextareaBase
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            required={type === "event-recap"}
            placeholder="Extra context for the AI, e.g. key takeaways or what happened at the event"
          />
        </FieldGroup>

        {showConsole && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Loader2 className={`h-3.5 w-3.5 animate-spin ${streaming ? "" : "opacity-0"}`} />
                <span>
                  {streaming
                    ? `AI News Desk drafting… ${elapsed}s`
                    : streamStatus === "Stopped by admin."
                      ? "Generation stopped"
                      : "Generation finished"}
                </span>
                {streamStatus && <span className="text-primary">· {streamStatus}</span>}
              </span>
              <span className="flex items-center gap-3">
                {(streamContent || streamRaw) && (
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline underline-offset-2"
                  >
                    {showRaw ? "Show preview" : "Show raw output"}
                  </button>
                )}
                {streaming && (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                  >
                    Stop
                  </button>
                )}
              </span>
            </div>

            {showRaw ? (
              <div
                ref={consoleRef}
                className="bg-foreground/[0.05] text-foreground/90 rounded-md p-4 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap"
              >
                {streamReasoning && (
                  <div className="text-muted-foreground italic mb-2 whitespace-pre-wrap">{streamReasoning}</div>
                )}
                {streamContent ? streamContent : <span className="text-muted-foreground">Waiting for the model…</span>}
                {streaming && <span className="inline-block w-2 h-4 bg-foreground/40 align-middle animate-pulse ml-0.5" />}
                {streamRaw && (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="text-destructive mb-1">Raw model output (what the model actually returned):</div>
                    <div className="text-muted-foreground line-clamp-6">{streamRaw.slice(0, 2000)}</div>
                  </div>
                )}
              </div>
            ) : (
              <div
                ref={consoleRef}
                className="rounded-md border border-border bg-card p-5 max-h-96 overflow-y-auto"
              >
                {streamReasoning && (
                  <div className="mb-4 rounded-md border border-border bg-foreground/[0.03] p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                      Thinking{streaming ? "…" : ""}
                    </p>
                    <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
                      {streamReasoning}
                    </pre>
                  </div>
                )}
                {preview.title && (
                  <h3 className="text-lg font-bold text-foreground mb-1">{preview.title}</h3>
                )}
                {preview.excerpt && (
                  <p className="text-sm text-muted-foreground mb-3">{preview.excerpt}</p>
                )}
                {preview.contentHtml ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-li:text-foreground/80"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.contentHtml) }}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {streaming ? "Waiting for the article body…" : "No article body produced."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={() => { abortRef.current?.abort(); onClose(); }}>Cancel</Button>
          <Button type="submit" variant="default" disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Drafting…" : "Generate Draft"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default GenerateBlogModal;
