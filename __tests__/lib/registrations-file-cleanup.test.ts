// Verifies cancel/decline flows also delete the registration's stored files.
const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockDeleteRegistrationFiles = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(() => 'doc-ref'),
  getDoc: jest.fn(),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  Timestamp: { now: jest.fn() },
}));

jest.mock('@/lib/firebase-client', () => ({ db: {} }));
jest.mock('@/lib/registration-files', () => ({
  deleteRegistrationFiles: (...args: unknown[]) =>
    mockDeleteRegistrationFiles(...args),
}));
jest.mock('@/lib/email', () => ({ sendTemplatedEmail: jest.fn() }));

import {
  cancelRegistration,
  declineRegistration,
} from '@/lib/firestore/registrations';

describe('registration cancellation file cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
    mockDeleteRegistrationFiles.mockResolvedValue(undefined);
  });

  it('marks the registration cancelled and deletes its files', async () => {
    await cancelRegistration('reg1');
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', {
      status: 'cancelled',
    });
    expect(mockDeleteRegistrationFiles).toHaveBeenCalledWith('reg1');
  });

  it('marks the registration declined and deletes its files', async () => {
    await declineRegistration('reg2');
    expect(mockUpdateDoc).toHaveBeenCalledWith('doc-ref', {
      status: 'declined',
    });
    expect(mockDeleteRegistrationFiles).toHaveBeenCalledWith('reg2');
  });

  it('does not fail the cancellation when file cleanup fails', async () => {
    mockDeleteRegistrationFiles.mockRejectedValueOnce(new Error('offline'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(cancelRegistration('reg1')).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
