// Verifies the client registration helpers delegate mutations to the server API.
const mockFetch = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(() => 'doc-ref'),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  Timestamp: { now: jest.fn() },
}));

jest.mock('@/lib/firebase-client', () => ({ db: {} }));
jest.mock('@/lib/email', () => ({ sendTemplatedEmail: jest.fn() }));

import {
  cancelRegistration,
  declineRegistration,
  removeRegistration,
} from '@/lib/firestore/registrations';

const okResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
});

describe('registration mutation client helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('cancels a registration through the server route', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());
    await cancelRegistration('reg1');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/registrations?regId=reg1&mode=cancel',
      { method: 'DELETE' },
    );
  });

  it('declines a registration through the server route', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());
    await declineRegistration('reg2');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/registrations?regId=reg2&mode=decline',
      { method: 'DELETE' },
    );
  });

  it('surfaces the server error message when cancelling fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Registration not found' }),
    });
    await expect(cancelRegistration('reg1')).rejects.toThrow(
      'Registration not found',
    );
  });

  it('removes a registration through the admin route', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());
    await removeRegistration('reg3');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/registrations?regId=reg3',
      { method: 'DELETE' },
    );
  });

  it('falls back to a status message when removal fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => null,
    });
    await expect(removeRegistration('reg3')).rejects.toThrow(
      'Remove failed (500)',
    );
  });
});
