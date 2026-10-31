import { createAuthMocks } from '@/__tests__/helpers/mocks';

const mockCheckRateLimit = jest.fn();
const mockReserveRequest = jest.fn();
const mockRecordTokens = jest.fn();
const mockProcessRAG = jest.fn();
const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);
jest.mock('@/lib/ai/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  reserveRequest: (...args: unknown[]) => mockReserveRequest(...args),
  recordTokens: (...args: unknown[]) => mockRecordTokens(...args),
  RateLimitError: class extends Error {
    resetAt: Date;
    remaining: number;
    constructor(msg: string) {
      super(msg);
      this.name = 'RateLimitError';
      this.resetAt = new Date();
      this.remaining = 0;
    }
  },
}));
jest.mock('@/lib/ai/rag', () => ({
  processRAGRequest: (...args: unknown[]) => mockProcessRAG(...args),
}));
jest.mock('@/lib/ai/openrouter', () => ({
  OpenRouterError: class extends Error {
    statusCode = 503;
  },
}));

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hello' }),
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token has no uid', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: {} });
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hello' }),
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(401);
  });

  it('returns 400 when query is empty', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: '' }),
    });
    const res = await POST(req as unknown as Request);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Bad request/i);
  });

  it('returns 400 when query is missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: '{}',
    });
    const res = await POST(req as unknown as Request);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Bad request/i);
  });

  it('returns 429 when rate limited', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    mockReserveRequest.mockResolvedValue({
      allowed: false,
      totalRequests: 50,
      remaining: 0,
      resetAt: new Date(),
      date: '2026-10-31',
    });

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hello' }),
    });
    const res = await POST(req as unknown as Request);
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.error).toMatch(/Rate limit/i);
  });

  it('returns successful response', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    mockReserveRequest.mockResolvedValue({
      allowed: true,
      totalRequests: 2,
      remaining: 48,
      resetAt: new Date(),
      date: '2026-10-31',
    });
    mockRecordTokens.mockResolvedValue(undefined);
    mockProcessRAG.mockResolvedValue({
      result: 'AI response',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      debug: null,
    });

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hello' }),
    });
    const res = await POST(req as unknown as Request);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBe('AI response');
    expect(body.usage.totalTokens).toBe(15);
    expect(body.rateLimit.remaining).toBe(48);
    expect(mockReserveRequest).toHaveBeenCalledWith('user1');
    expect(mockRecordTokens).toHaveBeenCalledWith('user1', '2026-10-31', 15);
  });

  it('does not call the model when the quota reservation is refused', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    mockReserveRequest.mockResolvedValue({
      allowed: false,
      totalRequests: 10,
      remaining: 0,
      resetAt: new Date(),
      date: '2026-10-31',
    });
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hello' }),
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(429);
    expect(mockProcessRAG).not.toHaveBeenCalled();
  });

  it('rejects an over-long query before reserving quota', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'x'.repeat(2001) }),
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);
    expect(mockReserveRequest).not.toHaveBeenCalled();
  });

  it('rejects an oversized body with 413', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/chat/route');
    const big = [{ role: 'user', content: 'x'.repeat(300 * 1024) }];
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hi', conversationHistory: big }),
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(413);
    expect(mockReserveRequest).not.toHaveBeenCalled();
  });

  it('keeps only recent history and truncates long messages', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    mockReserveRequest.mockResolvedValue({
      allowed: true,
      totalRequests: 1,
      remaining: 9,
      resetAt: new Date(),
      date: '2026-10-31',
    });
    mockRecordTokens.mockResolvedValue(undefined);
    mockProcessRAG.mockResolvedValue({
      result: 'r',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      debug: null,
    });
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 ? 'assistant' : 'user',
      content: `${i}`.padEnd(5000, 'x'),
    }));
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hi', conversationHistory: history }),
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(200);
    const sent = mockProcessRAG.mock.calls[0][0].conversationHistory;
    expect(sent).toHaveLength(20);
    expect(sent[0].content.startsWith('10')).toBe(true);
    expect(
      sent.every((m: { content: string }) => m.content.length <= 4000),
    ).toBe(true);
  });

  it('still answers when recording tokens fails', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    mockReserveRequest.mockResolvedValue({
      allowed: true,
      totalRequests: 1,
      remaining: 9,
      resetAt: new Date(),
      date: '2026-10-31',
    });
    mockRecordTokens.mockRejectedValue(new Error('firestore down'));
    mockProcessRAG.mockResolvedValue({
      result: 'r',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      debug: null,
    });
    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hi' }),
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(200);
  });

  it('passes debug data for admin users', async () => {
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin1', admin: true },
    });
    mockReserveRequest.mockResolvedValue({
      allowed: true,
      totalRequests: 2,
      remaining: 48,
      resetAt: new Date(),
      date: '2026-10-31',
    });
    mockRecordTokens.mockResolvedValue(undefined);
    mockProcessRAG.mockResolvedValue({
      result: 'response',
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      debug: { sources: ['doc1'] },
    });

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query: 'hello' }),
    });
    const res = await POST(req as unknown as Request);
    const body = await res.json();
    expect(body.debug).toEqual({ sources: ['doc1'] });
  });
});

describe('GET /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const { GET } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat');
    const res = await GET(req as unknown as Request);
    expect(res.status).toBe(401);
  });

  it('returns rate limit status', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      totalRequests: 50,
      remaining: 30,
      resetAt: new Date('2026-06-01'),
    });

    const { GET } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/api/chat');
    const res = await GET(req as unknown as Request);
    const body = await res.json();
    expect(body.remaining).toBe(30);
    expect(body.allowed).toBe(true);
  });
});
