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
      content: string | null;
      reasoning?: string | null;
      reasoning_details?: Array<{
        type?: string;
        text?: string;
      }>;
    };
    finish_reason?: string | null;
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

function extractJsonObjectFromText(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function summarizeChoice(choice: OpenRouterResponse['choices'][number] | undefined): string {
  if (!choice) return 'No choices returned by provider';
  const parts = [
    `finish_reason=${choice.finish_reason ?? 'unknown'}`,
    `content_present=${Boolean(choice.message?.content)}`,
    `reasoning_present=${Boolean(choice.message?.reasoning)}`,
    `reasoning_details_count=${choice.message?.reasoning_details?.length ?? 0}`,
  ];
  return parts.join(', ');
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

    //console.log('OpenRouter Response:', JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    const message = choice?.message;
    let content = message?.content?.trim() || '';

    // Some providers return null content with reasoning text instead.
    if (!content && message?.reasoning) {
      content = message.reasoning.trim();
    }
    if (!content && message?.reasoning_details?.length) {
      const reasoningText = message.reasoning_details
        .map((d) => d?.text || '')
        .filter(Boolean)
        .join('\n')
        .trim();
      if (reasoningText) content = reasoningText;
    }

    if (!content) {
      const summary = summarizeChoice(choice);
      const baseMessage = `Model returned no usable content (${summary})`;
      const status = choice?.finish_reason === 'length' ? 502 : 503;
      throw new OpenRouterError(baseMessage, status, data);
    }

    return {
      content,
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
): Promise<{ data: T; rawContent: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const result = await generateCompletion(messages, {
    ...options,
    responseFormat: { type: 'json_object' },
  });

  try {
    const data = JSON.parse(result.content) as T;
    return { data, rawContent: result.content, usage: result.usage };
  } catch {
    const extracted = extractJsonObjectFromText(result.content);
    if (extracted) {
      try {
        const data = JSON.parse(extracted) as T;
        return { data, rawContent: result.content, usage: result.usage };
      } catch {
        // Fall through to structured error below.
      }
    }

    const preview = result.content.slice(0, 300).replace(/\s+/g, ' ').trim();
    throw new OpenRouterError(
      `Failed to parse JSON response from OpenRouter API. Preview: ${preview || '[empty response]'}`,
      502
    );
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
