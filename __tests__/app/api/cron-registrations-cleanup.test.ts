import type { NextRequest } from 'next/server';

const mockGetFiles = jest.fn();
const mockEventsGet = jest.fn();
const mockRegistrationsGet = jest.fn();
const mockAttendanceGet = jest.fn();
const mockAttendanceSet = jest.fn().mockResolvedValue(undefined);
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

const mockAdminDb = {
  collection: jest.fn((name: string) => {
    if (name === 'events')
      return { get: (...args: unknown[]) => mockEventsGet(...args) };
    if (name === 'eventAttendance')
      return {
        doc: () => ({
          get: (...args: unknown[]) => mockAttendanceGet(...args),
          set: (...args: unknown[]) => mockAttendanceSet(...args),
        }),
      };
    if (name === 'registrations')
      return {
        where: () => ({
          limit: () => ({
            get: (...args: unknown[]) => mockRegistrationsGet(...args),
          }),
        }),
      };
    throw new Error(`unexpected collection ${name}`);
  }),
  batch: jest.fn(() => ({
    delete: (...args: unknown[]) => mockBatchDelete(...args),
    commit: (...args: unknown[]) => mockBatchCommit(...args),
  })),
};

jest.mock('@/lib/firebase-admin', () => ({ adminDb: mockAdminDb }));
jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({ getFiles: (...args: unknown[]) => mockGetFiles(...args) }),
  }),
  app: () => ({ options: { storageBucket: 'uuais.appspot.com' } }),
  firestore: { FieldValue: { delete: () => 'FIELD_DELETE' } },
}));

const DAY_MS = 24 * 60 * 60 * 1000;

function storageFile(
  name: string,
  ageDays: number,
  del = jest.fn().mockResolvedValue(undefined),
) {
  return {
    name,
    metadata: {
      timeCreated: new Date(Date.now() - ageDays * DAY_MS).toISOString(),
    },
    delete: del,
  };
}

function eventDoc(
  id: string,
  startIso: string | undefined,
  attendees?: unknown[],
) {
  const update = jest.fn().mockResolvedValue(undefined);
  return {
    id,
    get: (key: string) =>
      key === 'eventStartAt'
        ? startIso
        : key === 'attendees'
          ? attendees
          : undefined,
    ref: { update, id },
  };
}

describe('GET /api/cron/registrations-cleanup', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    mockGetFiles.mockResolvedValue([[]]);
    mockEventsGet.mockResolvedValue({ docs: [] });
    mockRegistrationsGet.mockResolvedValue({ empty: true, size: 0, docs: [] });
    mockAttendanceGet.mockResolvedValue({ exists: false });
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

  it('deletes attachments 60 days after their event, with a 90-day orphan fallback', async () => {
    const oldEvent = eventDoc(
      'evt1',
      new Date(Date.now() - 61 * DAY_MS).toISOString(),
    );
    const recentEvent = eventDoc(
      'evt2',
      new Date(Date.now() - 10 * DAY_MS).toISOString(),
    );
    mockEventsGet.mockResolvedValue({ docs: [oldEvent, recentEvent] });

    const expired = storageFile('registrations/evt1/user1/old.pdf', 1);
    const keepRecentEvent = storageFile('registrations/evt2/user1/new.pdf', 61);
    const orphan = storageFile('registrations/gone/user1/orphan.pdf', 95);
    const undated = {
      name: 'registrations/evt1/user1/unknown.pdf',
      metadata: {},
      delete: jest.fn(),
    };
    mockGetFiles.mockResolvedValue([
      [expired, keepRecentEvent, orphan, undated],
    ]);

    const res = await call('test-secret');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      scanned: 4,
      deleted: 3,
      deletedDocs: 0,
      migrated: 0,
    });
    expect(expired.delete).toHaveBeenCalledTimes(1);
    expect(orphan.delete).toHaveBeenCalledTimes(1);
    expect(undated.delete).toHaveBeenCalledTimes(1);
    expect(keepRecentEvent.delete).not.toHaveBeenCalled();
    expect(mockGetFiles).toHaveBeenCalledWith({
      prefix: 'registrations/',
      autoPaginate: true,
    });
  });

  it('tolerates individual delete failures', async () => {
    mockEventsGet.mockResolvedValue({
      docs: [
        eventDoc('evt1', new Date(Date.now() - 61 * DAY_MS).toISOString()),
      ],
    });
    const failing = storageFile(
      'registrations/evt1/user1/old.pdf',
      1,
      jest.fn().mockRejectedValue(new Error('storage down')),
    );
    mockGetFiles.mockResolvedValue([[failing]]);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await call('test-secret');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      scanned: 1,
      deleted: 0,
      deletedDocs: 0,
      migrated: 0,
    });
    warn.mockRestore();
  });

  it('deletes registration documents 36 months after the event', async () => {
    mockEventsGet.mockResolvedValue({
      docs: [
        eventDoc('evtOld', new Date(Date.now() - 1100 * DAY_MS).toISOString()),
      ],
    });
    mockRegistrationsGet
      .mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [{ ref: 'ref1' }, { ref: 'ref2' }],
      })
      .mockResolvedValueOnce({ empty: true, size: 0, docs: [] });

    const res = await call('test-secret');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deletedDocs).toBe(2);
    expect(mockBatchDelete).toHaveBeenCalledWith('ref1');
    expect(mockBatchDelete).toHaveBeenCalledWith('ref2');
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('migrates embedded attendees to the admin-only collection and drops the field', async () => {
    const attendees = [{ userId: 'u1', attended: true, timestamp: 5 }];
    const withAttendees = eventDoc(
      'evt1',
      new Date(Date.now() - 10 * DAY_MS).toISOString(),
      attendees,
    );
    const withoutAttendees = eventDoc(
      'evt2',
      new Date(Date.now() - 10 * DAY_MS).toISOString(),
    );
    mockEventsGet.mockResolvedValue({
      docs: [withAttendees, withoutAttendees],
    });

    const res = await call('test-secret');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockAttendanceSet).toHaveBeenCalledWith({ entries: attendees });
    expect(withAttendees.ref.update).toHaveBeenCalledWith({
      attendees: 'FIELD_DELETE',
    });
    expect(withoutAttendees.ref.update).not.toHaveBeenCalled();
    expect(body.migrated).toBe(1);
  });

  it('returns 500 when listing fails', async () => {
    mockGetFiles.mockRejectedValue(new Error('bucket unavailable'));
    const res = await call('test-secret');
    expect(res.status).toBe(500);
  });
});
