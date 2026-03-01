import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchOpenRouterModels, formatModelsForSelect } from '@/lib/ai/openrouter-models';
import { authorizeSuperAdmin } from '@/app/api/admin/AuthorizeAPI';

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeSuperAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

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
