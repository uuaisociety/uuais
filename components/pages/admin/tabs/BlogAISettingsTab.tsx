'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { FieldGroup, TextareaBase } from '@/components/ui/Form';
import Tag from '@/components/ui/Tag';
import { Loader2, Save, Bot, RefreshCw, EyeOff, Undo2, Plus } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { getBlogAISettings, updateBlogAISettings } from '@/lib/firestore/blog-ai-settings';
import { addUsedNewsUrl, removeUsedNewsUrl, getCoveredNewsUrls, type CoveredNewsUrl } from '@/lib/firestore/blog-seen';
import { DEFAULT_BLOG_AI_SETTINGS, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS } from '@/lib/ai/blog/defaults';
import { auth } from '@/lib/firebase-client';
import type { BlogAISettings, BlogFeed } from '@/lib/ai/blog/types';

function serializeFeeds(feeds: BlogFeed[]): string {
  return feeds
    .map((f) => (f.type === 'scrape' ? `${f.name}|SCRAPE|${f.url}|${f.hrefPrefix ?? ''}` : `${f.name}|${f.url}`))
    .join('\n');
}

function parseFeeds(text: string): { feeds: BlogFeed[]; errors: string[] } {
  const feeds: BlogFeed[] = [];
  const errors: string[] = [];
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts[1]?.toUpperCase() === 'SCRAPE') {
        const [, , url, prefix] = parts;
        if (!url || !prefix) {
          errors.push(`Line ${index + 1}: scrape feeds need 4 fields — Name|SCRAPE|URL|/href-prefix/`);
          return;
        }
        feeds.push({ name: parts[0], type: 'scrape', url, hrefPrefix: prefix });
      } else {
        const [name, url] = parts;
        if (!name || !url) {
          errors.push(`Line ${index + 1}: feed needs 2 fields — Name|URL`);
          return;
        }
        feeds.push({ name, type: 'rss', url });
      }
    });
  return { feeds, errors };
}

const BlogAISettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<BlogAISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedsText, setFeedsText] = useState('');
  const [openRouterModels, setOpenRouterModels] = useState<{ value: string; label: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [coveredUrls, setCoveredUrls] = useState<CoveredNewsUrl[]>([]);
  const [usedLoading, setUsedLoading] = useState(false);
  const [newUsedUrl, setNewUsedUrl] = useState('');

  const { isSuperAdmin } = useAdmin();

  const loadUsedUrls = async (silent = false) => {
    if (!silent) setUsedLoading(true);
    try {
      setCoveredUrls(await getCoveredNewsUrls());
    } catch (e) {
      console.warn('Failed to load covered news URLs:', e);
    } finally {
      if (!silent) setUsedLoading(false);
    }
  };

  const handleAddUsedUrl = async () => {
    const url = newUsedUrl.trim();
    if (!url) return;
    setNewUsedUrl('');
    // Optimistic: show the URL as used immediately, then reconcile silently.
    setCoveredUrls((prev) => {
      const exists = prev.some((item) => item.url === url);
      if (exists) return prev.map((item) => (item.url === url ? { ...item, used: true } : item));
      return [{ url, used: true, citedBy: [] }, ...prev];
    });
    try {
      await addUsedNewsUrl(url);
    } catch (e) {
      console.warn('Failed to mark news URL as used:', e);
      await loadUsedUrls();
    }
  };

  const handleReenableUsedUrl = async (url: string) => {
    // Optimistic: drop the URL immediately (it may stay listed if a post still cites it).
    setCoveredUrls((prev) =>
      prev.flatMap((item) => {
        if (item.url !== url) return [item];
        return item.citedBy.length > 0 ? [{ ...item, used: false }] : [];
      })
    );
    try {
      await removeUsedNewsUrl(url);
    } catch (e) {
      console.warn('Failed to re-enable news URL:', e);
      await loadUsedUrls();
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getBlogAISettings();
      setSettings(data);
      setFeedsText(serializeFeeds(data.feeds));
    } catch (e) {
      console.error('Failed to load blog AI settings:', e);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadOpenRouterModels = async () => {
    try {
      setModelsLoading(true);
      const res = await fetch('/api/admin/openrouter-models');
      if (!res.ok) return;
      const data = await res.json();
      setOpenRouterModels(data.models || []);
    } catch (e) {
      console.warn('Failed to load OpenRouter models:', e);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    if (!isSuperAdmin) {
      setError('Only super admins can update AI settings');
      return;
    }
    const { feeds, errors } = parseFeeds(feedsText);
    if (errors.length > 0) {
      setError(`Invalid feed lines: ${errors.join('; ')}`);
      return;
    }
    if (feeds.length === 0) {
      setError('At least one news source is required');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await updateBlogAISettings(
        {
          systemPrompt: settings.systemPrompt,
          model: settings.model,
          feeds,
          exaQuery: settings.exaQuery,
          editorialNotes: settings.editorialNotes,
          maxOutputTokens: settings.maxOutputTokens,
        },
        auth.currentUser?.uid || 'admin'
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save blog AI settings:', e);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset blog AI settings to defaults?')) {
      setSettings(DEFAULT_BLOG_AI_SETTINGS);
      setFeedsText(serializeFeeds(DEFAULT_BLOG_AI_SETTINGS.feeds));
    }
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    loadSettings();
    loadUsedUrls();
    if (isSuperAdmin) {
      loadOpenRouterModels();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load blog AI settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.028em] text-foreground">AI News Desk</h2>
            <p className="text-sm text-muted-foreground">Configure the blog generation model, prompts, and news sources</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Settings saved!</span>}
          <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
          <Button variant="outline" onClick={handleSave} disabled={saving || !isSuperAdmin}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Model */}
      <Card className="overflow-visible">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <FieldGroup label="Generation model">
              <SearchableSelect
                value={settings.model}
                onChange={(v) => setSettings({ ...settings, model: v })}
                options={openRouterModels.length > 0 ? openRouterModels.map((m) => m.value) : [settings.model]}
                placeholder="Type to search a model"
                ariaLabel="Generation model options"
                emptyText='No models match "{query}" — you can still use this text.'
                disabled={!isSuperAdmin}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isSuperAdmin
                  ? `Model used to generate AI News Desk drafts (${openRouterModels.length > 0 ? `${openRouterModels.length} models loaded` : 'default only'})`
                  : 'Only super admins can change the model'}
              </p>
            </FieldGroup>
            <div className="space-y-4">
              <FieldGroup label="Max output tokens" requiredHint="Per generation.">
                <Input
                  type="number"
                  min={MIN_OUTPUT_TOKENS}
                  max={MAX_OUTPUT_TOKENS}
                  step={256}
                  value={settings.maxOutputTokens}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setSettings({ ...settings, maxOutputTokens: Math.max(MIN_OUTPUT_TOKENS, Number(e.target.value) || MIN_OUTPUT_TOKENS) })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Reasoning tokens count against this budget. Raise it if a long-thinking model truncates the JSON.
                </p>
              </FieldGroup>
              <div className="flex items-end justify-end">
                <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadOpenRouterModels} disabled={modelsLoading || !isSuperAdmin}>
                  {modelsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh models'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardContent className="p-6">
          <FieldGroup label="System prompt" requiredHint="Guides the AI News Desk writing style.">
            <TextareaBase
              value={settings.systemPrompt}
              onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
              rows={10}
              className="font-mono text-sm"
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Editorial notes */}
      <Card>
        <CardContent className="p-6">
          <FieldGroup label="Editorial notes" requiredHint="Watch items + reader feedback injected into every generation.">
            <TextareaBase
              value={settings.editorialNotes}
              onChange={(e) => setSettings({ ...settings, editorialNotes: e.target.value })}
              rows={6}
              placeholder={'Watch items (prioritize when they hit):\n- \n\nReader feedback (what landed well — keep doing):\n- '}
            />
          </FieldGroup>
          <p className="text-xs text-muted-foreground mt-2">
            Example: specific releases to watch for, or feedback like "model releases with benchmark tables land well; include internship and student-program stories."
          </p>
        </CardContent>
      </Card>

      {/* News sources */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <FieldGroup label="News sources" requiredHint="One feed per line. RSS: Name|URL · Scrape: Name|SCRAPE|URL|/prefix/">
              <TextareaBase
                value={feedsText}
                onChange={(e) => setFeedsText(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder={'OpenAI News|https://openai.com/news/rss.xml\nAnthropic News|SCRAPE|https://www.anthropic.com/news|/news/\nBreakit|https://www.breakit.se/feed/artiklar'}
              />
            </FieldGroup>
            <p className="text-xs text-muted-foreground mt-2">
              Scrape sources pull article links from the page HTML (for outlets without a feed). Together with an Exa search, candidates are deduped and only genuinely new stories surface.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <FieldGroup label="Exa search query" requiredHint="Used for news discovery when EXA_API_KEY is set.">
              <Input
                type="text"
                value={settings.exaQuery}
                onChange={(e) => setSettings({ ...settings, exaQuery: e.target.value })}
                placeholder="major AI news this week"
              />
            </FieldGroup>
            <p className="text-xs text-muted-foreground mt-2">
              Candidates are gathered from these curated feeds plus an Exa search, deduped, and presented in the Generate AI Draft modal.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Used articles */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <EyeOff className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">
              Used articles <span className="text-sm font-normal text-muted-foreground">({coveredUrls.length})</span>
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            URLs shown here are skipped when the agent researches candidates. They include URLs marked used manually plus URLs cited by existing AI News Desk posts. Deleting a post releases its cited URLs.
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              value={newUsedUrl}
              onChange={(e) => setNewUsedUrl(e.target.value)}
              placeholder="https://example.com/article"
              aria-label="URL to mark as used"
            />
            <Button variant="outline" icon={Plus} onClick={handleAddUsedUrl} disabled={!newUsedUrl.trim() || !isSuperAdmin} aria-label="Mark URL as used">
              Mark used
            </Button>
          </div>

          {usedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : coveredUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles are currently marked as used or cited.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {coveredUrls.map((item) => (
                <li key={item.url} className="flex flex-col gap-2 p-3 rounded-md border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground hover:text-primary hover:underline break-all min-w-0"
                    >
                      {item.url}
                    </a>
                    {item.used && (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Undo2}
                        onClick={() => handleReenableUsedUrl(item.url)}
                        disabled={!isSuperAdmin}
                        aria-label="Re-enable article"
                        title="Allow the agent to use this article again"
                      >
                        Re-enable
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {item.used && <Tag variant="gray" size="sm">Used</Tag>}
                    {item.citedBy.length > 0 && (
                      <span>
                        Cited by: {item.citedBy.slice(0, 2).join(', ')}
                        {item.citedBy.length > 2 ? ` +${item.citedBy.length - 2} more` : ''}
                      </span>
                    )}
                    {!item.used && item.citedBy.length > 0 && (
                      <span>Cited by a post — delete the post to release this URL.</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-sm text-muted-foreground">
        Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}
      </div>
    </div>
  );
};

export default BlogAISettingsTab;
