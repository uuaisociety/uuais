import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { handleMcpRequest } from '@/lib/mcp/uuais-admin';

/**
 * MCP (Model Context Protocol) endpoint exposing UUAIS site data to the
 * mattermost-ai-agent. Stateless Streamable HTTP with JSON responses.
 *
 * Auth: bearer token from MCP_ADMIN_TOKEN (same secret must be configured in
 * the agent's environment). Tools exposed are read-only Firestore queries.
 */

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
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
  if (!isAuthorized(request)) {
    return jsonError('Unauthorized', 401, { 'WWW-Authenticate': 'Bearer' });
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
