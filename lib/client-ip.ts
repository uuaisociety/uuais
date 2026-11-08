/**
 * The client IP from the header the hosting platform's edge sets itself, so a client
 * can't choose its own rate-limit bucket or audit-log address. Railway sets X-Real-IP;
 * Vercel sets x-vercel-forwarded-for. Anywhere else (local dev) X-Forwarded-For is
 * client-controlled, but there is nothing better to read.
 */
export function clientIp(headers: {
  get(name: string): string | null;
}): string | undefined {
  const value = process.env.RAILWAY_ENVIRONMENT_ID
    ? headers.get('x-real-ip')
    : (process.env.VERCEL ? headers.get('x-vercel-forwarded-for') : null) ||
      headers.get('x-forwarded-for')?.split(',')[0];
  return value?.trim() || undefined;
}
