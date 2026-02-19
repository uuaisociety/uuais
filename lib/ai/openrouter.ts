const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenRouterResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: 'json_object' | 'text' };
  model?: string;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export async function generateCompletion(
  messages: Message[],
  options: GenerateOptions = {}
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured');
  }

  const {
    maxTokens = 1024,
    responseFormat = { type: 'json_object' },
    model = 'openai/gpt-4o-mini',
  } = options;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'UUAIS Course Advisor',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }
      console.error('OpenRouter API Error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorData,
        apiKeyPrefix: apiKey?.slice(0, 4),
      });
      throw new OpenRouterError(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status,
        errorData
      );
    }

    const data: OpenRouterResponse = await response.json();

    console.log('OpenRouter Response:', JSON.stringify(data, null, 2));

    if (!data.choices?.[0]?.message?.content) {
      throw new OpenRouterError(`Invalid response format from OpenRouter API: ${JSON.stringify(data)}`);
    }

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof OpenRouterError) {
      throw error;
    }
    throw new OpenRouterError(
      error instanceof Error ? error.message : 'Unknown error calling OpenRouter API'
    );
  }
}

export async function generateStructured<T>(
  messages: Message[],
  options: GenerateOptions = {}
): Promise<{ data: T; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const result = await generateCompletion(messages, {
    ...options,
    responseFormat: { type: 'json_object' },
  });

  try {
    const data = JSON.parse(result.content) as T;
    return { data, usage: result.usage };
  } catch {
    throw new OpenRouterError('Failed to parse JSON response from OpenRouter API');
  }
}

export const OPENROUTER_MODELS = [
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { value: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B' },
];
