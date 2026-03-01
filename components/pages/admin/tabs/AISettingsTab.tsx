'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AISettings } from '@/types';
import { getAISettings, updateAISettings } from '@/lib/firestore/ai-settings';
import { auth } from '@/lib/firebase-client';
import { Loader2, Save, Bot, Settings2, BarChart3, RefreshCw } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

type OpenRouterModelInfo = {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
};

type UsageStats = {
  date: string;
  totalRequests: number;
  activeUsers: number;
  averageTokensPerRequest: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

const AISettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const [openRouterModels, setOpenRouterModels] = useState<{ value: string; label: string; description?: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const { isSuperAdmin } = useAdmin();

  useEffect(() => {
    loadSettings();
    loadUsage();
    if (isSuperAdmin) {
      loadOpenRouterModels();
    }
  }, [isSuperAdmin]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAISettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load AI settings:', e);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setUsageLoading(true);
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/ai-usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<UsageStats>;
      setUsage({
        date: data.date || new Date().toISOString().slice(0, 10),
        totalRequests: data.totalRequests ?? 0,
        activeUsers: data.activeUsers ?? 0,
        averageTokensPerRequest: data.averageTokensPerRequest ?? 0,
        totalTokens: data.totalTokens ?? 0,
        estimatedCostUsd: data.estimatedCostUsd ?? 0,
      });
    } catch (e) {
      console.warn('Failed to load AI usage stats:', e);
    } finally {
      setUsageLoading(false);
    }
  };

  const loadOpenRouterModels = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setModelsLoading(true);
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/openrouter-models', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.warn('Failed to load OpenRouter models');
        return;
      }
      const data = await res.json();
      setOpenRouterModels(data.models || []);
      // Store raw models for pricing lookup
      (window as unknown as { rawModels: OpenRouterModelInfo[] }).rawModels = data.rawModels;
    } catch (e) {
      console.warn('Failed to load OpenRouter models:', e);
    } finally {
      setModelsLoading(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    if (!settings) return;
    
    // Auto-set cost based on model pricing
    const rawModels = (window as unknown as { rawModels?: OpenRouterModelInfo[] }).rawModels;
    if (rawModels) {
      const rawModel = rawModels.find(m => m.id === modelId);
      console.log("rawmodel:", rawModel);
      if (rawModel) {
        const costPer1k = (parseFloat(rawModel.pricing.prompt) + parseFloat(rawModel.pricing.completion)) * 1000;
        console.log("costPer1k:", costPer1k);
        setSettings({ ...settings, model: modelId, costPer1kTokensUsd: costPer1k });
        return;
      }
    }
    setSettings({ ...settings, model: modelId });
  };

  const handleSave = async () => {
    if (!settings) return;
    const user = auth.currentUser;
    if (!user) {
      setError('You must be signed in to save settings');
      return;
    }

    if (!isSuperAdmin) {
      setError('Only super admins can update AI settings');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateAISettings(
        {
          systemPrompt: settings.systemPrompt,
          model: settings.model,
          apiProvider: settings.apiProvider,
          costPer1kTokensUsd: settings.costPer1kTokensUsd,
          rateLimitRequestsPerDay: settings.rateLimitRequestsPerDay,
          maxTokensPerRequest: settings.maxTokensPerRequest,
          maxConversationHistory: settings.maxConversationHistory,
          maxStoredChatsPerUser: settings.maxStoredChatsPerUser,
        },
        user.uid
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save AI settings:', e);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default settings?')) {
      setSettings({
        systemPrompt: `You are an AI course advisor for Uppsala University AI Society (UUAIS). Help students find relevant AI courses at Uppsala University.

When recommending courses:
- Consider the student's level (bachelor's, master's, PhD)
- Consider location preferences (Uppsala campus vs online)
- Consider credit requirements
- Consider prerequisites and recommended prior knowledge
- Mention relevant teachers and research areas
- Be concise but informative

Always base your recommendations on the provided course context.`,
        model: 'mistralai/mistral-nemo',
        apiProvider: 'openrouter',
        costPer1kTokensUsd: 0,
        rateLimitRequestsPerDay: 10,
        maxTokensPerRequest: 1024,
        maxConversationHistory: 4,
        maxStoredChatsPerUser: 50,
        updatedAt: new Date().toISOString(),
        updatedBy: '',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-300">
        Failed to load AI settings
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-[#990000]" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure the AI course advisor behavior and limits</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">Settings saved!</span>
          )}
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !isSuperAdmin}
            title={!isSuperAdmin ? 'Only super admins can update AI settings' : undefined}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* System Prompt */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">System Prompt</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            This prompt guides the AI&apos;s behavior when responding to course queries. Changes apply immediately.
          </p>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#990000] focus:border-transparent font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* API Provider & Model */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">API Provider</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI API Provider
              </label>
              <Select
                value={settings.apiProvider}
                onChange={(e) => setSettings({ ...settings, apiProvider: e.target.value as 'moonshot' | 'openrouter', model: e.target.value === 'openrouter' ? 'openai/gpt-4o-mini' : 'moonshot-v1-8k' })}
                disabled={!isSuperAdmin}
                options={[
                  { value: 'openrouter', label: 'OpenRouter (recommended)' },
                  { value: 'moonshot', label: 'Moonshot' },
                ]}
              />
              <p className="text-xs text-gray-500 mt-1">OpenRouter supports many models including GPT-4, Claude, Gemini</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Model</h3>
              {isSuperAdmin && settings.apiProvider === 'openrouter' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadOpenRouterModels}
                  disabled={modelsLoading}
                >
                  {modelsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI model (USD per 1M tokens)
              </label>
              <Select
                value={settings.model}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={!isSuperAdmin}
                options={settings.apiProvider === 'openrouter' 
                  ? (openRouterModels.length > 0 ? openRouterModels : [])
                  : [
                      { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k' },
                      { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k' },
                    ]}
              />
              <p className="text-xs text-gray-500 mt-1">
                {settings.apiProvider === 'openrouter' && openRouterModels.length > 0
                  ? `Loaded ${openRouterModels.length} models from OpenRouter`
                  : 'Only super admins can change the model'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cost</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost per 1k tokens (USD)
              </label>
              <Input
                type="number"
                min={0}
                step={0.0001}
                value={settings.costPer1kTokensUsd}
                disabled={!isSuperAdmin}
                onChange={(e) => setSettings({ ...settings, costPer1kTokensUsd: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">Used for cost estimates in usage statistics</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limiting */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Rate Limiting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Requests per day
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.rateLimitRequestsPerDay}
                  onChange={(e) => setSettings({ ...settings, rateLimitRequestsPerDay: parseInt(e.target.value) || 10 })}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum AI requests per user per day</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max tokens per request
                </label>
                <Input
                  type="number"
                  min={256}
                  max={4096}
                  step={128}
                  value={settings.maxTokensPerRequest}
                  onChange={(e) => setSettings({ ...settings, maxTokensPerRequest: parseInt(e.target.value) || 1024 })}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum tokens in AI response</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">History Limits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max conversation history
                </label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={settings.maxConversationHistory}
                  onChange={(e) => setSettings({ ...settings, maxConversationHistory: parseInt(e.target.value) || 4 })}
                />
                <p className="text-xs text-gray-500 mt-1">Messages to include in context for AI responses</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max stored chats per user
                </label>
                <Input
                  type="number"
                  min={10}
                  max={200}
                  value={settings.maxStoredChatsPerUser}
                  onChange={(e) => setSettings({ ...settings, maxStoredChatsPerUser: parseInt(e.target.value) || 50 })}
                />
                <p className="text-xs text-gray-500 mt-1">Maximum chat history stored per user</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Stats (Placeholder) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Usage Statistics</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usageLoading ? '…' : (usage ? usage.totalRequests : '--')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total AI requests today</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usageLoading ? '…' : (usage ? usage.activeUsers : '--')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active users today</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usageLoading ? '…' : (usage ? usage.averageTokensPerRequest : '--')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Average tokens per request</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usageLoading ? '…' : (usage ? usage.totalTokens : '--')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total tokens today</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usageLoading ? '…' : (usage ? `$${usage.estimatedCostUsd.toFixed(4)}` : '--')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Estimated cost today (USD)</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Using cost per 1k tokens: ${settings.costPer1kTokensUsd.toFixed(4)}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" onClick={loadUsage} disabled={usageLoading}>
              Refresh
            </Button>
            {usage?.date && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Date: {usage.date}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Never'}
        {settings.updatedBy && ` by ${settings.updatedBy}`}
      </div>
    </div>
  );
};

export default AISettingsTab;
