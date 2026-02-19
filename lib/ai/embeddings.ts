const OPENROUTER_EMBEDDING_URL = 'https://openrouter.ai/api/v1/embeddings';

export type EmbeddingResponse = {
  data: {
    embedding: number[];
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
};

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new EmbeddingError('OPENROUTER_API_KEY is not configured');
  }

  try {
    const response = await fetch(OPENROUTER_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'UUAIS Course Advisor',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
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
      console.error('Embedding API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });
      throw new EmbeddingError(
        `Embedding API error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status,
        errorData
      );
    }

    const data: EmbeddingResponse = await response.json();

    if (!data.data?.[0]?.embedding) {
      throw new EmbeddingError(`Invalid embedding response: ${JSON.stringify(data)}`);
    }

    return data.data[0].embedding;
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error;
    }
    throw new EmbeddingError(
      error instanceof Error ? error.message : 'Unknown error generating embedding'
    );
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new EmbeddingError('OPENROUTER_API_KEY is not configured');
  }

  try {
    const response = await fetch(OPENROUTER_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'UUAIS Course Advisor',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      throw new EmbeddingError(
        `Embedding API error: ${response.status} ${response.statusText} - ${errorText}`,
        response.status
      );
    }

    const data: EmbeddingResponse = await response.json();

    const embeddings: number[][] = new Array(texts.length).fill([]);
    for (const item of data.data) {
      embeddings[item.index] = item.embedding;
    }

    return embeddings;
  } catch (error) {
    if (error instanceof EmbeddingError) {
      throw error;
    }
    throw new EmbeddingError(
      error instanceof Error ? error.message : 'Unknown error generating embeddings'
    );
  }
}

export function createCourseText(course: {
  title: string;
  description?: string;
  code?: string;
  tags?: string[];
  learningOutcomes?: string;
}): string {
  const parts = [
    course.title,
    course.code,
    course.description,
    course.tags?.join(' '),
    course.learningOutcomes,
  ].filter(Boolean);
  return parts.join(' | ');
}
