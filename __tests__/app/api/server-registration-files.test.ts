// Integration tests for storage helpers used by registration/cron/account deletion.
const mockDelete = jest.fn();
const mockGetFiles = jest.fn();
const mockBucket = {
  file: jest.fn(() => ({ delete: mockDelete })),
  getFiles: mockGetFiles,
};

jest.mock('firebase-admin', () => ({
  __esModule: true,
  default: {
    app: jest.fn(() => ({ options: {} })),
    storage: jest.fn(() => ({ bucket: jest.fn(() => mockBucket) })),
  },
}));
jest.mock('@/lib/firebase-admin', () => ({}));

import {
  collectRegistrationFilePaths,
  collectUserStorageFilePaths,
  deleteStorageFiles,
} from '@/lib/server-registration-files';

describe('deleteStorageFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats an already-missing object as deleted without warning', async () => {
    mockDelete.mockRejectedValueOnce(
      Object.assign(new Error('No such object: bucket/x.pdf'), { code: 404 }),
    );
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      deleteStorageFiles(['registrations/evt1/user1/x.pdf']),
    ).resolves.toBe(0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('continues past failures by default', async () => {
    mockDelete
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(deleteStorageFiles(['a', 'b'])).resolves.toBe(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('surfaces non-404 failures when failOnError is set', async () => {
    mockDelete.mockRejectedValueOnce(new Error('permission denied'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      deleteStorageFiles(['a'], { failOnError: true }),
    ).rejects.toThrow('permission denied');
    warn.mockRestore();
  });
});

describe('collectUserStorageFilePaths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists files under each event folder for the user', async () => {
    mockGetFiles
      .mockResolvedValueOnce([
        [],
        {},
        { prefixes: ['registrations/evt1/', 'registrations/evt2/'] },
      ])
      .mockResolvedValueOnce([
        [{ name: 'registrations/evt1/user1/a.pdf' }],
        {},
        {},
      ])
      .mockResolvedValueOnce([
        [{ name: 'registrations/evt2/user1/b.pdf' }],
        {},
        {},
      ]);

    await expect(collectUserStorageFilePaths('user1')).resolves.toEqual([
      'registrations/evt1/user1/a.pdf',
      'registrations/evt2/user1/b.pdf',
    ]);
    expect(mockGetFiles).toHaveBeenNthCalledWith(2, {
      prefix: 'registrations/evt1/user1/',
    });
  });
});

describe('collectRegistrationFilePaths', () => {
  it('returns only uploaded refs under the registration prefix', () => {
    expect(
      collectRegistrationFilePaths({
        eventId: 'evt1',
        userId: 'user1',
        registrationData: {
          cv: {
            path: 'registrations/evt1/user1/a.pdf',
            name: 'a.pdf',
            size: 1,
          },
          other: {
            path: 'registrations/evt2/user1/b.pdf',
            name: 'b.pdf',
            size: 1,
          },
          plain: 'text',
        },
      }),
    ).toEqual(['registrations/evt1/user1/a.pdf']);
  });
});
