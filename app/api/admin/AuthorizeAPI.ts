import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function authorizeAdmin(req: NextRequest): Promise<{ ok: true; uid: string } | { ok: false }> {
    const authHeader = req.headers.get('authorization');
    console.log("Auth header: ", authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false };
    const idToken = authHeader.slice('Bearer '.length);
    console.log("ID token: ", idToken.substring(0, 50) + "...");
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        console.log("Decoded token:", {
            uid: decoded.uid,
            issuer: decoded.iss,
            aud: decoded.aud,
            admin: decoded.admin,
            superAdmin: decoded.superAdmin
        });
        if (decoded?.uid && (decoded.admin === true || decoded.superAdmin === true)) {
            return { ok: true, uid: decoded.uid };
        }
        return { ok: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Full Auth Error:", error);
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Full Auth Error:", error);
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
    return { ok: false };
  }
}