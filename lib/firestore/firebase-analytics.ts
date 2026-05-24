export interface FirebaseAnalyticsRow {
  date: string;
  activeUsers: number;
  newUsers: number;
  totalUsers: number;
  sessions: number;
  screenPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  eventCount: number;
}

export interface FirebaseAnalyticsResponse {
  configured: boolean;
  message?: string;
  propertyId?: string;
  from?: string;
  to?: string;
  rows?: FirebaseAnalyticsRow[];
  totals?: Record<string, number>;
  debug?: unknown;
}

export async function fetchFirebaseAnalytics(opts?: {
  from?: string;
  to?: string;
  debug?: boolean;
}): Promise<FirebaseAnalyticsResponse> {
  const params = new URLSearchParams();
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);
  if (opts?.debug) params.set('debug', 'true');

  const qs = params.toString();
  const res = await fetch(`/api/analytics/firebase${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    return { configured: false, message: `API error: ${res.status}` };
  }
  return res.json();
}
