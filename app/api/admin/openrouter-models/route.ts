import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';
import { fetchOpenRouterModels, formatModelsForSelect } from '@/lib/ai/openrouter-models';

export async function GET(req: NextRequest) {
  try {
    // Verify Firebase auth using next-firebase-auth-edge
    const tokens = await getTokens(req.cookies, authConfig);
    if (!tokens) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin claims
    const isAdmin = tokens.decodedToken.admin === true || tokens.decodedToken.superAdmin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
