import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

/**
 * GET /api/analytics/firebase
 *
 * Proxies the Google Analytics Data API v1beta to return GA4 metrics
 * (page views, active users, sessions, etc.) for the configured property.
 *
 * Required env vars:
 *   GA4_PROPERTY_ID     – The numeric Google Analytics 4 property ID
 *                        (e.g. "123456789", NOT the G-XXXX measurement ID)
 *   GOOGLE_APPLICATION_CREDENTIALS – Path to a service account JSON that
 *                        has been granted access to the GA4 property
 *                        (usually your Firebase service account)
 *
 * Enabling the API:
 *   1. Go to https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com
 *   2. Select your Firebase project and enable the "Google Analytics Data API"
 *   3. In Google Analytics Admin → Property Access Management, add your
 *      Firebase service account email as a Viewer
 *
 * Query params:
 *   from  – start date (YYYY-MM-DD, default: 30 days ago)
 *   to    – end date   (YYYY-MM-DD, default: today)
 *   debug – set "true" to include raw API response in output
 */

const GA4_API = 'https://analyticsdata.googleapis.com/v1beta';

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token?.token) throw new Error('Failed to obtain access token');
  return token.token;
}

const METRICS = [
  'activeUsers',
  'newUsers',
  'totalUsers',
  'sessions',
  'screenPageViews',
  'averageSessionDuration',
  'bounceRate',
  'eventCount',
];

const DIMENSIONS = ['date'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true';

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    return NextResponse.json(
      {
        configured: false,
        message:
          'GA4_PROPERTY_ID not set. Add it to your .env.local ' +
          '(this is the numeric GA4 property ID, NOT the G-XXXX measurement ID). ' +
          'Also make sure the Google Analytics Data API is enabled in your GCP project.',
      },
      { status: 200 },
    );
  }

  const now = new Date();
  const from =
    searchParams.get('from') ||
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = searchParams.get('to') || now.toISOString().slice(0, 10);

  try {
    const token = await getAccessToken();

    const res = await fetch(`${GA4_API}/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: DIMENSIONS.map((name) => ({ name })),
        metrics: METRICS.map((name) => ({ name })),
        keepEmptyRows: false,
      }),
      next: { revalidate: 3600 }, // 1-hour cache
    });

    const body = await res.json();

    if (!res.ok) {
      const errorDetail = body?.error?.message || res.statusText;
      return NextResponse.json(
        {
          configured: false,
          message: `Google Analytics Data API error: ${errorDetail}`,
          ...(debug ? { debug: { status: res.status, response: body } } : {}),
        },
        { status: 200 },
      );
    }

    // Parse rows into a clean time-series format
    const rows = (body?.rows || []).map((row: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }) => {
      const date = row.dimensionValues?.[0]?.value || '';
      const metrics: Record<string, number> = {};
      METRICS.forEach((name, i) => {
        const val = row.metricValues?.[i]?.value;
        metrics[name] = val !== undefined ? parseFloat(val) : 0;
      });
      return { date, ...metrics };
    });

    // Compute totals
    const totals: Record<string, number> = {};
    METRICS.forEach((name) => {
      totals[name] = rows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r[name]) || 0), 0);
    });

    // Top-level totals from the API response
    const rawTotals = body?.totals?.[0]?.metricValues || [];
    METRICS.forEach((name, i) => {
      const v = rawTotals[i]?.value;
      if (v !== undefined) totals[name] = parseFloat(v);
    });

    return NextResponse.json(
      {
        configured: true,
        propertyId,
        from,
        to,
        rows,
        totals,
        ...(debug ? { debug: { rawResponse: body } } : {}),
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        configured: false,
        message: `Failed to query Google Analytics: ${msg}`,
        ...(debug ? { debug: { error: msg } } : {}),
      },
      { status: 200 },
    );
  }
}
