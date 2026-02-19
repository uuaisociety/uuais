import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { fetchOpenRouterModels, formatModelsForSelect } from '@/lib/ai/openrouter-models';

async function authorizeSuperAdmin(req: NextRequest): Promise<{ ok: true; uid: string } | { ok: false }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false };

  const idToken = authHeader.slice('Bearer '.length);
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded?.uid && decoded.superAdmin === true) {
      return { ok: true, uid: decoded.uid };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

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
