import { handleMcpRequest } from '@/lib/mcp/uuais-admin';
import type { PublicSeed } from '@/lib/server-data';

const mockGetPublicSeed = jest.fn();
const mockFetchCourses = jest.fn();
const mockGetUserByEmail = jest.fn();

jest.mock('@/lib/server-data', () => ({
  getPublicSeed: (...args: unknown[]) => mockGetPublicSeed(...args),
}));

jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    getUserByEmail: (...args: unknown[]) => mockGetUserByEmail(...args),
  },
  adminDb: {
    collection: () => ({
      where: () => ({
        where: () => ({
          orderBy: () => ({ limit: () => ({ get: () => ({ docs: [] }) }) }),
        }),
      }),
      orderBy: () => ({ limit: () => ({ get: () => ({ docs: [] }) }) }),
      limit: () => ({ get: () => ({ docs: [] }) }),
      get: () => ({ docs: [] }),
      doc: () => ({ get: () => ({ exists: false, data: () => undefined }) }),
    }),
  },
}));

jest.mock('@/lib/courses', () => ({
  fetchCourses: (...args: unknown[]) => mockFetchCourses(...args),
  fetchCourseById: () => undefined,
}));

const seed: PublicSeed = {
  events: [
    {
      id: 'e1',
      title: 'AI Meetup',
      description: 'A talk',
      location: 'Ångström',
      eventStartAt: '2026-09-01T10:00:00Z',
      attendees: [{ userId: 'uid-123', attended: true, timestamp: 123 }],
    } as never,
  ],
  jobs: [{ id: 'j1', title: 'Dev', company: 'Acme' } as never],
  faqs: [
    {
      id: 'f1',
      question: 'Join?',
      answer: 'Sign up',
      category: 'general',
      order: 1,
      published: true,
    } as never,
    {
      id: 'f2',
      question: 'Draft?',
      answer: 'hidden',
      category: 'general',
      order: 2,
      published: false,
    } as never,
  ],
  teamMembers: [
    {
      id: 't1',
      name: 'Ada',
      position: 'Board',
      email: 'ada@uuais.com',
      personalEmail: 'ada@personal.com',
      notes: 'internal',
    } as never,
    { id: 't2', name: 'Drafty', position: 'Member', published: false } as never,
  ],
};

async function mcpPost(message: Record<string, unknown>): Promise<Response> {
  const req = new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(message),
  });
  return handleMcpRequest(req);
}

async function jsonResult(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe('lib/mcp/uuais-admin (real transport)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPublicSeed.mockResolvedValue(seed);
    mockFetchCourses.mockResolvedValue([]);
  });

  it('initializes and lists all 15 tools over the transport', async () => {
    const init = await jsonResult(
      await mcpPost({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      }),
    );
    expect(init.result).toBeDefined();
    expect(
      (init.result as { serverInfo?: { name: string } }).serverInfo?.name,
    ).toBe('uuais-admin');

    const list = await jsonResult(
      await mcpPost({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    );
    const tools = (list.result as { tools: { name: string }[] }).tools.map(
      (t) => t.name,
    );
    expect(tools).toHaveLength(15);
    expect(tools).toContain('getUuaisMemberRole');
    expect(tools).toContain('getUuaisEvents');
    expect(tools).toContain('getUuaisTeam');
    expect(tools).toContain('searchUuaisContent');
    expect(tools).toContain('getUuaisSiteStats');
  });

  it('strips attendee PII from events', async () => {
    const res = await jsonResult(
      await mcpPost({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'getUuaisEvents', arguments: { limit: 1 } },
      }),
    );
    const text = (res.result as { content: { type: string; text: string }[] })
      .content[0].text;
    const body = JSON.parse(text) as { events: Record<string, unknown>[] };
    expect(body.events[0].title).toBe('AI Meetup');
    expect(body.events[0].attendees).toBeUndefined();
  });

  it('filters draft content and drops private team fields', async () => {
    const teamRes = await jsonResult(
      await mcpPost({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'getUuaisTeam', arguments: {} },
      }),
    );
    const team = JSON.parse(
      (teamRes.result as { content: { text: string }[] }).content[0].text,
    ) as {
      team: Record<string, unknown>[];
    };
    expect(team.team.map((m) => m.name)).toEqual(['Ada']);
    expect(team.team[0].personalEmail).toBeUndefined();
    expect(team.team[0].notes).toBeUndefined();
    expect(team.team[0].email).toBe('ada@uuais.com');

    const faqRes = await jsonResult(
      await mcpPost({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'getUuaisFaqs', arguments: {} },
      }),
    );
    const faqs = JSON.parse(
      (faqRes.result as { content: { text: string }[] }).content[0].text,
    ) as {
      faqs: { question: string }[];
    };
    expect(faqs.faqs.map((f) => f.question)).toEqual(['Join?']);
  });

  describe('getUuaisMemberRole', () => {
    async function memberRole(email: string): Promise<Record<string, unknown>> {
      const res = await jsonResult(
        await mcpPost({
          jsonrpc: '2.0',
          id: 7,
          method: 'tools/call',
          params: { name: 'getUuaisMemberRole', arguments: { email } },
        }),
      );
      const result = res.result as {
        content: { text: string }[];
        isError?: boolean;
      };
      return result.isError
        ? { isError: true }
        : JSON.parse(result.content[0].text);
    }

    it('reports admin and superAdmin flags only, for a normalised email', async () => {
      mockGetUserByEmail.mockResolvedValue({
        uid: 'uid-1',
        email: 'ada@uuais.com',
        displayName: 'Ada',
        disabled: false,
        customClaims: { superAdmin: true },
      });
      expect(await memberRole(' Ada@UUAIS.com ')).toEqual({
        found: true,
        admin: true,
        superAdmin: true,
      });
      expect(mockGetUserByEmail).toHaveBeenCalledWith('ada@uuais.com');
    });

    it('treats a plain member as not admin', async () => {
      mockGetUserByEmail.mockResolvedValue({
        uid: 'uid-2',
        disabled: false,
        customClaims: {},
      });
      expect(await memberRole('bob@uuais.com')).toEqual({
        found: true,
        admin: false,
        superAdmin: false,
      });
    });

    it('grants nothing to a disabled account', async () => {
      mockGetUserByEmail.mockResolvedValue({
        uid: 'uid-3',
        disabled: true,
        customClaims: { admin: true },
      });
      expect(await memberRole('gone@uuais.com')).toEqual({
        found: true,
        admin: false,
        superAdmin: false,
      });
    });

    it('reports an unknown email as not found', async () => {
      mockGetUserByEmail.mockRejectedValue(
        Object.assign(new Error('no user'), { code: 'auth/user-not-found' }),
      );
      expect(await memberRole('nobody@uuais.com')).toEqual({
        found: false,
        admin: false,
        superAdmin: false,
      });
    });

    it('reports available:false when Firebase Auth fails, never "not admin"', async () => {
      mockGetUserByEmail.mockRejectedValue(new Error('auth down'));
      expect(await memberRole('ada@uuais.com')).toEqual({ available: false });
    });

    it('rejects input that is not an email', async () => {
      expect(await memberRole('not-an-email')).toEqual({ isError: true });
      expect(mockGetUserByEmail).not.toHaveBeenCalled();
    });
  });

  it('reports available:false when the data source fails', async () => {
    mockGetPublicSeed.mockRejectedValue(new Error('firebase down'));
    const res = await jsonResult(
      await mcpPost({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'getUuaisEvents', arguments: { limit: 5 } },
      }),
    );
    const text = (res.result as { content: { text: string }[] }).content[0]
      .text;
    expect(JSON.parse(text)).toEqual({ available: false });
  });
});
