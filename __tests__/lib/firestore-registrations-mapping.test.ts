const mockGetDocs = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  deleteDoc: jest.fn(),
  Timestamp: class Timestamp {
    toDate() {
      return new Date('2025-01-02T03:04:05.000Z');
    }
  },
}));

jest.mock('@/lib/firebase-client', () => ({ db: {} }));
jest.mock('@/lib/email', () => ({ sendTemplatedEmail: jest.fn() }));

import { Timestamp } from 'firebase/firestore';
import {
  getEventRegistrations,
  getMyRegistrationForEvent,
  subscribeToEventRegistrations,
} from '@/lib/firestore/registrations';

const docSnapshot = {
  id: 'reg-1',
  exists: () => true,
  data: () => ({ registeredAt: new Timestamp() }),
};

describe('EventRegistration Firestore mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue({ docs: [docSnapshot], empty: false });
  });

  it('preserves defaults and converts Timestamp across list, subscription, and single reads', async () => {
    const expected = {
      id: 'reg-1',
      eventId: '',
      userId: '',
      registrationData: {},
      registeredAt: '2025-01-02T03:04:05.000Z',
      status: 'registered',
      userName: null,
      userEmail: null,
      selectedAt: null,
      confirmedAt: null,
      confirmationToken: null,
    };
    await expect(getEventRegistrations('event-1')).resolves.toEqual([expected]);
    await expect(
      getMyRegistrationForEvent('user-1', 'event-1'),
    ).resolves.toEqual(expected);

    const callback = jest.fn();
    subscribeToEventRegistrations('event-1', callback);
    const [, onNext] = mockOnSnapshot.mock.calls[0];
    onNext({ docs: [docSnapshot] });
    expect(callback).toHaveBeenCalledWith([expected]);
  });
});
