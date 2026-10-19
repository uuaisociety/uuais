import type { NextRequest } from 'next/server';

const mockGetFiles = jest.fn();

jest.mock('@/lib/firebase-admin', () => ({}));
jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({ getFiles: (...args: unknown[]) => mockGetFiles(...args) }),
  }),
  app: () => ({ options: { storageBucket: 'uuais.appspot.com' } }),
}));

function storageFile(
  name: string,
  ageDays: number,
  del = jest.fn().mockResolvedValue(undefined),
) {
  return {
    name,
    metadata: {
      timeCreated: new Date(
        Date.now() - ageDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    delete: del,
  };
}

describe('GET /api/cron/registrations-cleanup', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    mockGetFiles.mockResolvedValue([[]]);
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  const call = async (secretHeader?: string) => {
    const { GET } = await import('@/app/api/cron/registrations-cleanup/route');
    const req = new Request('http://localhost/api/cron/registrations-cleanup', {
      headers: secretHeader ? { Authorization: `Bearer ${secretHeader}` } : {},
    });
    return GET(req as unknown as NextRequest);
  };

  it('returns 401 without a valid secret', async () => {
    const res = await call('wrong-secret');
    expect(res.status).toBe(401);
    expect(mockGetFiles).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET is not configured', async () => {
    process.env.CRON_SECRET = '';
    const res = await call('test-secret');
    expect(res.status).toBe(401);
  });

  it('deletes only attachments older than 60 days', async () => {
    const expired = storageFile('registrations/evt1/user1/old.pdf', 61);
    const recent = storageFile('registrations/evt1/user1/new.pdf', 10);
    const undated = {
      name: 'registrations/evt1/user1/unknown.pdf',
      metadata: {},
      delete: jest.fn(),
    };
    mockGetFiles.mockResolvedValue([[expired, recent, undated]]);

    const res = await call('test-secret');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, scanned: 3, deleted: 1 });
    expect(mockGetFiles).toHaveBeenCalledWith({
      prefix: 'registrations/',
      autoPaginate: true,
    });
    expect(expired.delete).toHaveBeenCalledTimes(1);
    expect(recent.delete).not.toHaveBeenCalled();
    expect(undated.delete).not.toHaveBeenCalled();
  });

  it('tolerates individual delete failures', async () => {
    const failing = storageFile(
      'registrations/evt1/user1/old.pdf',
      70,
      jest.fn().mockRejectedValue(new Error('storage down')),
    );
    mockGetFiles.mockResolvedValue([[failing]]);

    const res = await call('test-secret');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, scanned: 1, deleted: 0 });
  });

  it('returns 500 when listing fails', async () => {
    mockGetFiles.mockRejectedValue(new Error('bucket unavailable'));
    const res = await call('test-secret');
    expect(res.status).toBe(500);
  });
});
