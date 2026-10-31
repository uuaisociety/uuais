// POST /api/admin/mail: the server picks recipient and content from the stored
// record, skips unsubscribed members, and logs each queued email.
import { createAuthMocks } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

let docs: Record<string, Record<string, unknown>>;
const mockMailSet = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id?: string) =>
        name === 'mail'
          ? { id: 'mail-1', set: mockMailSet }
          : {
              get: async () => {
                const data = docs[`${name}/${id}`];
                return {
                  exists: !!data,
                  get: (field: string) => data?.[field],
                };
              },
            },
    }),
  },
}));
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'TS' },
}));

const mockRender = jest.fn().mockResolvedValue('<p>html</p>');
jest.mock('@/lib/email', () => ({
  renderTemplatedEmail: (...args: unknown[]) => mockRender(...args),
}));

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));

const post = (body: unknown) => {
  const req = new Request('http://localhost/api/admin/mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return Object.assign(req, {
    nextUrl: new URL('http://localhost/api/admin/mail'),
  }) as never;
};

describe('POST /api/admin/mail', () => {
  const OLD_ENV = process.env.NEXT_PUBLIC_SITE_URL;
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://uuais.test';
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin1', admin: true },
    });
    docs = {
      'registrations/r1': {
        status: 'invited',
        confirmationToken: 'tok',
        userEmail: 'ada@example.com',
        userName: 'Ada',
        userId: 'u1',
        eventId: 'e1',
      },
      'events/e1': { title: 'AI Night' },
      'users/u1': { email: 'ada@example.com' },
      'showcaseProjects/p1': {
        published: true,
        creatorUserId: 'u1',
        title: 'Nav',
        slug: 'nav',
      },
    };
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_SITE_URL = OLD_ENV;
  });

  it('refuses non-admins', async () => {
    const { POST } = await import('@/app/api/admin/mail/route');
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'u1' } });
    expect((await POST(post({ kind: 'event-invite', id: 'r1' }))).status).toBe(
      403,
    );
    expect(mockMailSet).not.toHaveBeenCalled();
  });

  it('queues the invite from the stored registration and logs it first', async () => {
    const { POST } = await import('@/app/api/admin/mail/route');
    const res = await POST(post({ kind: 'event-invite', id: 'r1' }));
    expect(res.status).toBe(200);
    expect(mockRender).toHaveBeenCalledWith(
      expect.objectContaining({
        templatePath: '/email-templates/eventRegistration.html',
        variables: {
          name: 'Ada',
          confirm_link: 'https://uuais.test/confirm/tok',
        },
      }),
    );
    expect(mockMailSet).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        message: { subject: 'Invitation to AI Night', html: '<p>html</p>' },
      }),
    );
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUid: 'admin1',
        path: 'mail/mail-1',
        regId: 'r1',
      }),
      { required: true },
    );
    expect(mockLog.mock.invocationCallOrder[0]).toBeLessThan(
      mockMailSet.mock.invocationCallOrder[0],
    );
  });

  it('sends nothing to an unsubscribed member or for an uninvited registration', async () => {
    const { POST } = await import('@/app/api/admin/mail/route');
    docs['users/u1'].unsubscribedFromEmails = true;
    expect((await POST(post({ kind: 'event-invite', id: 'r1' }))).status).toBe(
      200,
    );
    docs['users/u1'].unsubscribedFromEmails = false;
    docs['registrations/r1'].status = 'registered';
    expect((await POST(post({ kind: 'event-invite', id: 'r1' }))).status).toBe(
      200,
    );
    expect(mockMailSet).not.toHaveBeenCalled();
  });

  it('emails the builder of a published project only', async () => {
    const { POST } = await import('@/app/api/admin/mail/route');
    await POST(post({ kind: 'showcase-approved', id: 'p1' }));
    expect(mockMailSet).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ada@example.com' }),
    );
    expect(mockRender.mock.calls[0][0].variables.project_url).toBe(
      'https://uuais.test/showcase/nav',
    );
    mockMailSet.mockClear();
    docs['showcaseProjects/p1'].published = false;
    await POST(post({ kind: 'showcase-approved', id: 'p1' }));
    expect(mockMailSet).not.toHaveBeenCalled();
  });

  it('rejects unknown kinds and bad ids', async () => {
    const { POST } = await import('@/app/api/admin/mail/route');
    expect((await POST(post({ kind: 'raw', id: 'r1' }))).status).toBe(400);
    expect((await POST(post({ kind: 'event-invite', id: 'a/b' }))).status).toBe(
      400,
    );
    expect(mockMailSet).not.toHaveBeenCalled();
  });

  it('queues nothing when the log fails', async () => {
    mockLog.mockRejectedValueOnce(new Error('down'));
    const { POST } = await import('@/app/api/admin/mail/route');
    expect((await POST(post({ kind: 'event-invite', id: 'r1' }))).status).toBe(
      500,
    );
    expect(mockMailSet).not.toHaveBeenCalled();
  });
});
