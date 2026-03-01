import { NextResponse } from 'next/server';
import { fetchOpenRouterModels, formatModelsForSelect } from '@/lib/ai/openrouter-models';

export async function GET() {
  try {
    const models = await fetchOpenRouterModels();

    return NextResponse.json({
      models: formatModelsForSelect(models),
      rawModels: models.map(m => ({
        id: m.id,
        name: m.name,
        pricing: m.pricing,
        contextLength: m.context_length,
      })),
    });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
