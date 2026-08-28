import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface ShowcaseRateLimitStatus {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkShowcaseRateLimit(
  uid: string,
  action: string,
  limit: number,
  windowMinutes: number
): Promise<ShowcaseRateLimitStatus> {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const ref = adminDb.collection('showcase_usage').doc(`${uid}_${action}`);

  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;

  if (!data || typeof data.windowStart !== 'number' || now - data.windowStart >= windowMs) {
    // First request in a fresh window: start counting from here.
    await ref.set({ uid, action, windowStart: now, count: 1 }, { merge: true });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (typeof data.count === 'number' && data.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((data.windowStart + windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  await ref.update({ count: FieldValue.increment(1) });
  return { allowed: true, retryAfterSeconds: 0 };
}
