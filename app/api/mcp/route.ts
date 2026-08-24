import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { handleMcpRequest } from '@/lib/mcp/uuais-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';

/**
 * MCP (Model Context Protocol) endpoint exposing UUAIS site data to the
 * mattermost-ai-agent. Stateless Streamable HTTP with JSON responses.
 *
 * Auth: bearer token from MCP_ADMIN_TOKEN (same secret must be configured in
 * the agent's environment). Tools exposed are read-only Firestore queries.
 *
 * Rate limits (defense-in-depth, in-memory per instance): a per-IP burst cap
 * and a stricter failed-auth cap to slow brute-force probing.
 */

const BURST_LIMIT = 60;
const BURST_WINDOW_MS = 60_000;
const AUTH_FAIL_LIMIT = 10;
const AUTH_FAIL_WINDOW_MS = 15 * 60_000;

function clientKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Constant-time comparison without a length oracle: hash both inputs (SHA-256)
 * so the compared buffers are always the same length, then timing-safe compare.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.MCP_ADMIN_TOKEN;
  if (!expected) return false;
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token) return false;
  return safeEqual(token, expected);
}

function jsonError(message: string, status: number, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

export async function POST(request: NextRequest) {
  const ip = clientKey(request);
  const burst = checkWindow(`mcp:burst:${ip}`, BURST_LIMIT, BURST_WINDOW_MS);
  if (!burst.allowed) {
    return jsonError('Too many requests', 429);
  }

  if (!isAuthorized(request)) {
    const fail = checkWindow(`mcp:authfail:${ip}`, AUTH_FAIL_LIMIT, AUTH_FAIL_WINDOW_MS);
    if (!fail.allowed) {
      return jsonError('Too many requests', 429);
    }
    return jsonError('Unauthorized', 401, { 'WWW-Authenticate': 'Bearer realm="api"' });
  }

  try {
    return await handleMcpRequest(request);
  } catch (error) {
    console.error('[mcp] failed to handle request', error);
    return jsonError('Internal server error', 500);
  }
}

export async function GET() {
  return jsonError('Method not allowed', 405, { Allow: 'POST' });
}

export async function DELETE() {
  return jsonError('Method not allowed', 405, { Allow: 'POST' });
}
