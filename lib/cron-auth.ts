import { timingSafeEqual } from 'node:crypto';

/** Timing-safe check of the `Authorization: Bearer $CRON_SECRET` header. */
export function isValidCronRequest(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(req.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
