const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export type OpenRouterModel = {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length: number;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

export type OpenRouterModelsResponse = {
  data: OpenRouterModel[];
};

export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("OPENROUTER_API_KEY is not set");
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      method: 'GET',
      headers: {
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'UUAIS Course Advisor',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      console.error('OpenRouter Models API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data: OpenRouterModelsResponse = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    throw error;
  }
}

export function getModelPricing(models: OpenRouterModel[], modelId: string): { prompt: number; completion: number; total: number } | null {
  const model = models.find(m => m.id === modelId);
  if (!model) return null;

  return {
    prompt: model.pricing.prompt,
    completion: model.pricing.completion,
    total: model.pricing.prompt + model.pricing.completion,
  };
}

export function formatModelsForSelect(models: OpenRouterModel[]): { value: string; label: string; description?: string; pricing?: { prompt: number; completion: number; total: number } }[] {
  return models.map(m => ({
    value: m.id,
    label: (m.name || m.id.split('/').pop() || m.id) + ` (prompt: ${(m.pricing.prompt*1000000).toFixed(3)}, completion: ${(m.pricing.completion*1000000).toFixed(3)})`,
    description: m.description?.slice(0, 100),
  }));
}
