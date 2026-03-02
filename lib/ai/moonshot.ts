const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1/chat/completions';

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type MoonshotResponse = {
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

export class MoonshotError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'MoonshotError';
  }
}

export async function generateCompletion(
  messages: Message[],
  options: GenerateOptions = {}
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  
  if (!apiKey) {
    throw new MoonshotError('MOONSHOT_API_KEY is not configured');
  }

  const {
    maxTokens = 1024,
    responseFormat = { type: 'json_object' },
    model = 'moonshot-v1-8k',
  } = options;

  try {
    const response = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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
      console.error('Moonshot API Error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorData,
        apiKeyPrefix: apiKey?.slice(0, 4),
      });
      throw new MoonshotError(
        `Moonshot API error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status,
        errorData
      );
    }

    const data: MoonshotResponse = await response.json();
    
    console.log('Moonshot Response:', JSON.stringify(data, null, 2));
    
    if (!data.choices?.[0]?.message?.content) {
      throw new MoonshotError(`Invalid response format from Moonshot API: ${JSON.stringify(data)}`);
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
    if (error instanceof MoonshotError) {
      throw error;
    }
    throw new MoonshotError(
      error instanceof Error ? error.message : 'Unknown error calling Moonshot API'
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
    throw new MoonshotError('Failed to parse JSON response from Moonshot API');
  }
}
