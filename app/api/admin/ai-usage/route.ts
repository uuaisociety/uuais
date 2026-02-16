import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

async function authorizeAdmin(req: NextRequest): Promise<{ ok: true; uid: string } | { ok: false }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false };

  const idToken = authHeader.slice('Bearer '.length);
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded?.uid && decoded.admin === true) {
      return { ok: true, uid: decoded.uid };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const today = getTodayString();

    const snap = await adminDb
      .collection('ai_usage')
      .where('date', '==', today)
      .get();

    let totalRequests = 0;
    let totalTokens = 0;
    let activeUsers = 0;

    for (const doc of snap.docs) {
      const data = doc.data() as { requestCount?: number; tokenUsage?: number };
      const reqCount = typeof data.requestCount === 'number' ? data.requestCount : 0;
      const tokens = typeof data.tokenUsage === 'number' ? data.tokenUsage : 0;

      totalRequests += reqCount;
      totalTokens += tokens;
      if (reqCount > 0) activeUsers += 1;
    }

    const averageTokensPerRequest = totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0;

    let usdPer1kTokens = Number.parseFloat(process.env.AI_USD_PER_1K_TOKENS || '0');
    try {
      const settingsDoc = await adminDb.collection('config').doc('ai_settings').get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data && typeof data.costPer1kTokensUsd === 'number') {
          usdPer1kTokens = data.costPer1kTokensUsd;
        }
      }
    } catch (e) {
      console.warn('Failed to load costPer1kTokensUsd from Firestore, using env fallback:', e);
    }
    const estimatedCostUsd = usdPer1kTokens > 0 ? (totalTokens / 1000) * usdPer1kTokens : 0;

    return NextResponse.json({
      date: today,
      totalRequests,
      activeUsers,
      averageTokensPerRequest,
      totalTokens,
      estimatedCostUsd,
    });
  } catch (e) {
    console.error('ai-usage admin api error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
