const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(() => 'registration-ref'),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  Timestamp: class Timestamp {},
  deleteDoc: jest.fn(),
}));
jest.mock('@/lib/firebase-client', () => ({ db: {} }));
jest.mock('@/lib/email', () => ({ sendTemplatedEmail: jest.fn() }));

describe('registration confirmation token generation', () => {
  it('fails closed when secure browser randomness is unavailable', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ userEmail: null }),
    });
    const originalCrypto = global.crypto;
    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: undefined,
    });
    try {
      const { inviteRegistrant } =
        await import('@/lib/firestore/registrations');
      await expect(inviteRegistrant('registration-1')).rejects.toThrow(
        /Secure random generator unavailable/,
      );
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(global, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });
});
