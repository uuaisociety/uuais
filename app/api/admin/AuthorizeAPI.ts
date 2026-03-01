import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function authorizeAdmin(req: NextRequest): Promise<{ ok: true; uid: string } | { ok: false }> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false };

    const idToken = authHeader.slice('Bearer '.length);
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (decoded?.uid && (decoded.admin === true || decoded.superAdmin === true)) {
            return { ok: true, uid: decoded.uid };
        }
        return { ok: false };
    } catch {
        return { ok: false };
    }
}

export async function authorizeSuperAdmin(req: NextRequest): Promise<{ ok: true; uid: string } | { ok: false }> {
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