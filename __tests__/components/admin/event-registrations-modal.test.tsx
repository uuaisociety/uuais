import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import EventRegistrationsModal from '@/components/pages/admin/modals/EventRegistrationsModal';
import type { EventCustomQuestion, EventRegistration } from '@/types';

const mockNotify = jest.fn();

jest.mock('@/lib/firestore/registrations', () => {
  let callback: ((regs: EventRegistration[]) => void) | null = null;
  return {
    subscribeToEventRegistrations: jest.fn(
      (_eventId: string, cb: (regs: EventRegistration[]) => void) => {
        callback = cb;
        return jest.fn();
      },
    ),
    inviteRegistrant: jest.fn(),
    removeRegistration: jest.fn(),
    _emit: (regs: EventRegistration[]) => callback?.(regs),
  };
});

jest.mock('@/lib/firestore/attendance', () => ({
  subscribeToEventAttendance: jest.fn(() => jest.fn()),
  setAttendanceForUser: jest.fn(),
}));

jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: mockNotify }),
}));

function mockedRegistrationsModule() {
  return jest.requireMock('@/lib/firestore/registrations') as {
    removeRegistration: jest.Mock;
    _emit: (regs: EventRegistration[]) => void;
  };
}

const questions: EventCustomQuestion[] = [
  {
    id: 'q1',
    eventId: 'evt1',
    question: 'Upload CV',
    type: 'file',
    required: false,
    order: 1,
  },
];

const registration: EventRegistration = {
  id: 'reg1',
  eventId: 'evt1',
  userId: 'user1',
  userName: 'Alice',
  userEmail: 'alice@example.com',
  status: 'registered',
  registeredAt: '2027-01-01T00:00:00Z',
  registrationData: {
    'Upload CV': {
      path: 'registrations/evt1/user1/1_cv.pdf',
      name: 'cv.pdf',
      size: 10,
    },
  },
};

async function renderModal(regs: EventRegistration[] = [registration]) {
  render(
    <EventRegistrationsModal
      open
      eventId="evt1"
      eventTitle="Test Event"
      questions={questions}
      onClose={jest.fn()}
    />,
  );
  await act(async () => {
    mockedRegistrationsModule()._emit(regs);
  });
}

describe('EventRegistrationsModal admin actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes a registration after confirmation', async () => {
    await renderModal();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alice' }));
    fireEvent.click(
      screen.getByRole('button', { name: /Remove selected \(1\)/ }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove registration' }),
    );

    await waitFor(() =>
      expect(
        mockedRegistrationsModule().removeRegistration,
      ).toHaveBeenCalledWith('reg1'),
    );
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    );
  });

  it('removes all selected registrations', async () => {
    await renderModal([
      registration,
      {
        ...registration,
        id: 'reg2',
        userId: 'user2',
        userName: 'Bob',
        userEmail: 'bob@example.com',
      },
    ]);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    fireEvent.click(
      screen.getByRole('button', { name: /Remove selected \(2\)/ }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Remove 2 registrations',
      }),
    );

    await waitFor(() =>
      expect(
        mockedRegistrationsModule().removeRegistration,
      ).toHaveBeenCalledWith('reg2'),
    );
    expect(mockedRegistrationsModule().removeRegistration).toHaveBeenCalledWith(
      'reg1',
    );
    expect(
      screen.getByRole('checkbox', { name: 'Select all' }),
    ).not.toBeChecked();
  });

  it('does not remove a registration when the confirmation is cancelled', async () => {
    await renderModal();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alice' }));
    fireEvent.click(
      screen.getByRole('button', { name: /Remove selected \(1\)/ }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Keep registrations' }),
    );

    expect(
      mockedRegistrationsModule().removeRegistration,
    ).not.toHaveBeenCalled();
  });

  it('includes an absolute download link for uploaded files in the CSV export', async () => {
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    await renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    const blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    const text = await blob.text();
    expect(text).toContain(
      'cv.pdf (http://localhost/api/admin/registrations/file?path=registrations%2Fevt1%2Fuser1%2F1_cv.pdf)',
    );
  });
});
