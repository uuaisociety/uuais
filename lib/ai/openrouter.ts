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

/**
 * String-aware brace matching that returns the balanced JSON object starting at
 * the first `{` of `input`. Keeps JSON that legitimately contains braces intact.
 */
function extractBalancedJson(input: string): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return input.slice(0, i + 1);
    }
  }
  return null;
}

/**
 * Parse `content` as a T, falling back to embedded-JSON extraction. Tries every
 *  balanced {...} block (newest-first) so corrupted or narrated output can still
 *  yield a usable object. */
export function tryParseJson<T>(content: string): T | undefined {
  try {
    return JSON.parse(content) as T;
  } catch {
    // Fall through to extraction.
  }

  const starts: number[] = [];
  for (let i = content.length - 1; i >= 0; i--) {
    if (content[i] === '{') starts.push(i);
  }
  let tried = 0;
  for (const start of starts) {
    if (tried >= 25) break;
    tried++;
    const block = extractBalancedJson(content.slice(start));
    if (!block) continue;
    try {
      return JSON.parse(block) as T;
    } catch {
      // Try the next candidate block.
    }
  }
  return undefined;
}

function sumUsage(
  a: { promptTokens: number; completionTokens: number; totalTokens: number },
  b: { promptTokens: number; completionTokens: number; totalTokens: number }
) {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
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
): Promise<{ content: string; reasoning: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
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
    const reasoning =
      message?.reasoning?.trim() ||
      (message?.reasoning_details?.length
        ? message.reasoning_details.map((d) => d?.text || '').filter(Boolean).join('\n').trim()
        : '') ||
      '';
    let content = message?.content?.trim() || '';

    // Some providers return null content with reasoning text instead.
    if (!content && reasoning) {
      content = reasoning;
    }

    if (!content) {
      const summary = summarizeChoice(choice);
      const baseMessage = `Model returned no usable content (${summary})`;
      const status = choice?.finish_reason === 'length' ? 502 : 503;
      throw new OpenRouterError(baseMessage, status, data);
    }

    return {
      content,
      reasoning,
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

export interface StreamChunk {
  reasoning: string;
  content: string;
}

export interface StreamedCompletion {
  content: string;
  reasoning: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

/**
 * Stream a completion from OpenRouter via SSE. Yields each delta through
 * `onChunk` (when provided) and resolves with the fully accumulated output.
 * Token usage is captured from the final streamed chunk when the provider
 * honours `stream_options.include_usage`.
 */
export async function streamCompletion(
  messages: Message[],
  options: GenerateOptions = {},
  onChunk?: (chunk: StreamChunk) => void
): Promise<StreamedCompletion> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured');
  }

  const { maxTokens = 2048, temperature, model = 'openai/gpt-4o-mini' } = options;

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
      ...(temperature !== undefined ? { temperature } : {}),
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => 'No response body');
    console.error('OpenRouter streaming error:', response.status, errorText);
    throw new OpenRouterError(
      `OpenRouter streaming API error: ${response.status} ${response.statusText}`,
      response.status,
      errorText
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let reasoning = '';
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;

      let json: { choices?: { delta?: { content?: string | null; reasoning?: string | null } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
      try {
        json = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = json.choices?.[0]?.delta;
      const deltaContent = typeof delta?.content === 'string' ? delta.content : '';
      const deltaReasoning = typeof delta?.reasoning === 'string' ? delta.reasoning : '';
      if (deltaContent) content += deltaContent;
      if (deltaReasoning) reasoning += deltaReasoning;

      if (json.usage) {
        usage = {
          promptTokens: json.usage.prompt_tokens ?? 0,
          completionTokens: json.usage.completion_tokens ?? 0,
          totalTokens: json.usage.total_tokens ?? 0,
        };
      }

      if (onChunk && (deltaContent || deltaReasoning)) {
        onChunk({ reasoning: deltaReasoning, content: deltaContent });
      }
    }
  }

  return { content, reasoning, usage };
}

export async function generateStructured<T>(
  messages: Message[],
  options: GenerateOptions = {}
): Promise<{ data: T; rawContent: string; reasoning: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const callOptions: GenerateOptions = { ...options, responseFormat: { type: 'json_object' } };

  const result = await generateCompletion(messages, callOptions);
  const firstData = tryParseJson<T>(result.content);
  if (firstData !== undefined) {
    return { data: firstData, rawContent: result.content, reasoning: result.reasoning, usage: result.usage };
  }

  // Some models narrate their reasoning before returning JSON. Retry once with a
  // repair instruction so a single messy response doesn't fail the whole request.
  const retry = await generateCompletion(
    [
      ...messages,
      { role: 'assistant' as const, content: result.content },
      {
        role: 'user' as const,
        content:
          'Your previous response was not valid JSON. Reply with ONLY a single valid JSON object. No markdown, no prose, no reasoning — just the JSON.',
      },
    ],
    { ...callOptions, temperature: 0 }
  );
  const retryData = tryParseJson<T>(retry.content);
  if (retryData !== undefined) {
    const reasoning = [result.reasoning, retry.reasoning].filter(Boolean).join('\n\n');
    return { data: retryData, rawContent: retry.content, reasoning, usage: sumUsage(result.usage, retry.usage) };
  }

  const preview = (retry.content || result.content).slice(0, 300).replace(/\s+/g, ' ').trim();
  throw new OpenRouterError(
    `Failed to parse JSON response from OpenRouter API. Preview: ${preview || '[empty response]'}`,
    502
  );
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
