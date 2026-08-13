import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import EventRegistrationDialog from '@/components/events/EventRegistrationDialog';
import type { Event, EventCustomQuestion } from '@/types';

// ====================================================================
// MOCKS
// ====================================================================

// Auth mock – callback holder pattern (see join-page.test.tsx)
const authCallbackHolder: { current: ((user: unknown) => void) | null } = {
  current: null,
};
jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn((cb: (user: unknown) => void) => {
      authCallbackHolder.current = cb;
      return jest.fn();
    }),
  },
}));

jest.mock('@/lib/firestore/registrations', () => ({
  registerForEvent: jest.fn(),
  getMyRegistrations: jest.fn(),
  cancelRegistration: jest.fn(),
  confirmRegistration: jest.fn(),
}));

jest.mock('@/lib/firestore/questions', () => {
  let questionCallback: ((qs: EventCustomQuestion[]) => void) | null = null;
  return {
    subscribeToEventCustomQuestions: jest.fn(
      (_eventId: string, cb: (qs: EventCustomQuestion[]) => void) => {
        questionCallback = cb;
        return jest.fn();
      },
    ),
    _triggerQuestions: (qs: EventCustomQuestion[]) => {
      if (questionCallback) questionCallback(qs);
    },
  };
});

jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn(),
}));

jest.mock('@/components/ui/Notifications', () => {
  const mockNotify = jest.fn();
  return {
    __esModule: true,
    _mockNotify: mockNotify,
    NotificationsProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useNotify: () => ({ notify: mockNotify }),
  };
});

jest.mock('@/components/ui/ConfirmModal', () => ({
  __esModule: true,
  default: ({
    open,
    title,
    description,
    confirmText,
    cancelText,
    onConfirm,
    onClose,
  }: {
    open: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onClose: () => void;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="confirm-modal">
        <div data-testid="confirm-modal-title">{title}</div>
        <div data-testid="confirm-modal-description">{description}</div>
        <button data-testid="confirm-modal-confirm" onClick={onConfirm}>
          {confirmText}
        </button>
        <button data-testid="confirm-modal-cancel" onClick={onClose}>
          {cancelText}
        </button>
      </div>
    );
  },
}));

// ====================================================================
// HELPERS
// ====================================================================

async function simulateAuth(user: Record<string, unknown> | null) {
  const cb = authCallbackHolder.current;
  if (cb) await act(async () => { await cb(user); });
}

function mockedRegistrations() {
  return jest.requireMock('@/lib/firestore/registrations') as {
    registerForEvent: jest.Mock;
    getMyRegistrations: jest.Mock;
    cancelRegistration: jest.Mock;
    confirmRegistration: jest.Mock;
  };
}

function mockedUsers() {
  return jest.requireMock('@/lib/firestore/users') as {
    getUserProfile: jest.Mock;
  };
}

function mockedQuestionsModule() {
  return jest.requireMock('@/lib/firestore/questions') as {
    subscribeToEventCustomQuestions: jest.Mock;
    _triggerQuestions: (qs: EventCustomQuestion[]) => void;
  };
}

function getNotifyMock(): jest.Mock {
  return jest.requireMock('@/components/ui/Notifications')._mockNotify as jest.Mock;
}

// ====================================================================
// FIXTURES
// ====================================================================

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt1',
    title: 'Test Event Title',
    description: 'Test description',
    location: 'Online',
    image: '/test.jpg',
    category: 'workshop',
    status: 'upcoming',
    registrationRequired: true,
    maxCapacity: 100,
    currentRegistrations: 50,
    published: true,
    eventStartAt: '2027-06-15T18:00:00Z',
    registrationClosesAt: '2027-06-14T23:59:00Z',
    ...overrides,
  };
}

const mockUser = { uid: 'user1', email: 'test@test.com' };

// ====================================================================
// TESTS
// ====================================================================

describe('EventRegistrationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // Past event
  // ------------------------------------------------------------------
  describe('past event', () => {
    it('renders past event message when eventStartAt is in the past', () => {
      const pastEvent = createEvent({ eventStartAt: '2020-01-01T00:00:00Z' });
      render(<EventRegistrationDialog event={pastEvent} />);
      expect(screen.getByText('This event has already passed.')).toBeInTheDocument();
      // No registration UI
      expect(screen.queryByText('Register Now')).not.toBeInTheDocument();
      expect(screen.queryByText('Join Waitlist')).not.toBeInTheDocument();
      expect(screen.queryByText(/sign in and become a member/)).not.toBeInTheDocument();
    });
  });

  // ------------------------------------------------------------------
  // Already registered
  // ------------------------------------------------------------------
  describe('already registered statuses', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: true,
      });
    });

    it('shows registered status with Cancel button', async () => {
      mockedRegistrations().getMyRegistrations.mockResolvedValue([
        { id: 'reg1', eventId: 'evt1', status: 'registered' },
      ]);

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      expect(
        screen.getByText('You have already registered for this event.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows waitlist status with Cancel button', async () => {
      mockedRegistrations().getMyRegistrations.mockResolvedValue([
        { id: 'reg1', eventId: 'evt1', status: 'waitlist' },
      ]);

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      expect(
        screen.getByText('You have already joined the waitlist'),
      ).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows invited status with Confirm spot and Cancel buttons', async () => {
      mockedRegistrations().getMyRegistrations.mockResolvedValue([
        {
          id: 'reg1',
          eventId: 'evt1',
          status: 'invited',
          confirmationToken: 'tok123',
        },
      ]);

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      expect(
        screen.getByText('You have been invited to this event.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Confirm spot')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows confirmed status without action buttons', async () => {
      mockedRegistrations().getMyRegistrations.mockResolvedValue([
        { id: 'reg1', eventId: 'evt1', status: 'confirmed' },
      ]);

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      expect(screen.getByText('Your spot is confirmed.')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText('Confirm spot')).not.toBeInTheDocument();
    });
  });

  // ------------------------------------------------------------------
  // Auth states
  // ------------------------------------------------------------------
  describe('authentication states', () => {
    it('shows sign-in message when not authenticated', () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      expect(
        screen.getByText(/Please sign in and become a member/),
      ).toBeInTheDocument();
      expect(screen.getByText('Login / Create account')).toBeInTheDocument();
      expect(screen.queryByText('Register Now')).not.toBeInTheDocument();
      expect(screen.queryByText('Join Waitlist')).not.toBeInTheDocument();
    });

    it('shows sign-in message when authenticated but not a member', async () => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: false,
      });
      mockedRegistrations().getMyRegistrations.mockResolvedValue([]);

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      expect(
        screen.getByText(/Please sign in and become a member/),
      ).toBeInTheDocument();
    });

    it('handles getMyRegistrations error gracefully', async () => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: true,
      });
      mockedRegistrations().getMyRegistrations.mockRejectedValue(
        new Error('Network error'),
      );

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('Register Now')).toBeInTheDocument();
      });
    });
  });

  // ------------------------------------------------------------------
  // Registration flow
  // ------------------------------------------------------------------
  describe('registration flow', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: true,
        email: 'test@test.com',
        displayName: 'Test User',
      });
      mockedRegistrations().getMyRegistrations.mockResolvedValue([]);
    });

    it('shows Register Now button for open registration', async () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      expect(screen.getByText('Register Now')).toBeInTheDocument();
    });

    it('shows Join Waitlist button when capacity is full', async () => {
      const fullEvent = createEvent({
        maxCapacity: 50,
        currentRegistrations: 50,
      });
      render(<EventRegistrationDialog event={fullEvent} />);
      await simulateAuth(mockUser);

      expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
    });

    it('shows Join Waitlist button after registration closes', async () => {
      const closedEvent = createEvent({
        registrationClosesAt: '2020-01-01T00:00:00Z',
      });
      render(<EventRegistrationDialog event={closedEvent} />);
      await simulateAuth(mockUser);

      expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
    });

    it('opens dialog with event title when Register Now is clicked', async () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Register Now'));

      expect(screen.getByText('Register for Event')).toBeInTheDocument();
      expect(screen.getByText('Test Event Title')).toBeInTheDocument();
    });

    it('opens dialog with waitlist title when capacity is full', async () => {
      const fullEvent = createEvent({
        maxCapacity: 50,
        currentRegistrations: 50,
      });
      render(<EventRegistrationDialog event={fullEvent} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Join Waitlist'));

      // Dialog heading should say "Join Waitlist"
      expect(
        screen.getByRole('heading', { name: 'Join Waitlist' }),
      ).toBeInTheDocument();
    });

    it('closes dialog when Cancel button is clicked in form', async () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Register Now'));
      expect(screen.getByText('Register for Event')).toBeInTheDocument();

      // Click the Cancel button inside the form
      const cancelButtons = screen.getAllByText('Cancel');
      // The form Cancel button is inside the dialog
      const formCancel = cancelButtons.find(
        (btn) => btn.closest('form') !== null,
      );
      expect(formCancel).toBeInTheDocument();
      fireEvent.click(formCancel!);

      expect(screen.queryByText('Register for Event')).not.toBeInTheDocument();
    });
  });

  // ------------------------------------------------------------------
  // Custom questions
  // ------------------------------------------------------------------
  describe('custom questions', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: true,
      });
      mockedRegistrations().getMyRegistrations.mockResolvedValue([]);
    });

    it('renders all question types in the dialog', async () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      const questions: EventCustomQuestion[] = [
        {
          id: 'q1',
          eventId: 'evt1',
          question: 'Your name?',
          type: 'text',
          required: false,
          order: 1,
        },
        {
          id: 'q2',
          eventId: 'evt1',
          question: 'Your bio?',
          type: 'textarea',
          required: false,
          order: 2,
        },
        {
          id: 'q3',
          eventId: 'evt1',
          question: 'Pick one',
          type: 'select',
          options: ['A', 'B'],
          required: false,
          order: 3,
        },
        {
          id: 'q4',
          eventId: 'evt1',
          question: 'Choose radio',
          type: 'radio',
          options: ['X', 'Y'],
          required: false,
          order: 4,
        },
        {
          id: 'q5',
          eventId: 'evt1',
          question: 'Check all',
          type: 'checkbox',
          options: ['C1', 'C2'],
          required: false,
          order: 5,
        },
      ];
      act(() => {
        mockedQuestionsModule()._triggerQuestions(questions);
      });

      fireEvent.click(screen.getByText('Register Now'));

      // Question text labels are rendered
      expect(screen.getByText('Your name?')).toBeInTheDocument();
      expect(screen.getByText('Your bio?')).toBeInTheDocument();
      expect(screen.getByText('Pick one')).toBeInTheDocument();
      expect(screen.getByText('Choose radio')).toBeInTheDocument();
      expect(screen.getByText('Check all')).toBeInTheDocument();

      // Check input types via document queries (labels lack htmlFor, so inputs
      // have no accessible name — role queries won't work here; the dialog is
      // portaled to document.body so container.querySelector cannot see it)
      expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
      expect(document.querySelector('textarea')).toBeInTheDocument();
      expect(document.querySelector('select')).toBeInTheDocument();
      expect(document.querySelector('input[type="radio"]')).toBeInTheDocument();
      expect(document.querySelector('input[type="checkbox"]')).toBeInTheDocument();
    });

    it('shows required indicator on required questions', async () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      const questions: EventCustomQuestion[] = [
        {
          id: 'q1',
          eventId: 'evt1',
          question: 'Required field',
          type: 'text',
          required: true,
          order: 1,
        },
      ];
      act(() => {
        mockedQuestionsModule()._triggerQuestions(questions);
      });

      fireEvent.click(screen.getByText('Register Now'));

      // The * indicator should be next to the question
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('shows warning when required question is unanswered', async () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      const questions: EventCustomQuestion[] = [
        {
          id: 'q1',
          eventId: 'evt1',
          question: 'Required question?',
          type: 'text',
          required: true,
          order: 1,
        },
      ];
      act(() => {
        mockedQuestionsModule()._triggerQuestions(questions);
      });

      fireEvent.click(screen.getByText('Register Now'));

      // Submit without answering
      const submitBtn = screen.getByRole('button', { name: 'Register' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            title: 'Missing answer',
          }),
        );
      });
    });
  });

  // ------------------------------------------------------------------
  // Submit registration
  // ------------------------------------------------------------------
  describe('submit registration', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: true,
        email: 'test@test.com',
        displayName: 'Test User',
      });
      mockedRegistrations().getMyRegistrations.mockResolvedValue([]);
    });

    it('successfully registers and shows success notification', async () => {
      mockedRegistrations().registerForEvent.mockResolvedValue('reg1');

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Register Now'));
      fireEvent.click(screen.getByRole('button', { name: 'Register' }));

      await waitFor(() => {
        expect(mockedRegistrations().registerForEvent).toHaveBeenCalledWith(
          'evt1',
          expect.objectContaining({
            userId: 'user1',
            userEmail: 'test@test.com',
          }),
          { waitlist: false },
        );
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: 'Registration successful',
          }),
        );
      });
    });

    it('successfully joins waitlist when capacity is full', async () => {
      mockedRegistrations().registerForEvent.mockResolvedValue('reg1');
      const fullEvent = createEvent({
        maxCapacity: 50,
        currentRegistrations: 50,
      });

      render(<EventRegistrationDialog event={fullEvent} />);
      await simulateAuth(mockUser);

      // Click the trigger button (only one "Join Waitlist" before dialog opens)
      fireEvent.click(screen.getByText('Join Waitlist'));

      // After dialog opens, click the submit button (last "Join Waitlist" button)
      const waitlistButtons = screen.getAllByRole('button', {
        name: 'Join Waitlist',
      });
      // The submit button has type="submit"
      const submitBtn = waitlistButtons.find(
        (b) => b.getAttribute('type') === 'submit',
      );
      expect(submitBtn).toBeInTheDocument();
      fireEvent.click(submitBtn!);

      await waitFor(() => {
        expect(mockedRegistrations().registerForEvent).toHaveBeenCalledWith(
          'evt1',
          expect.any(Object),
          { waitlist: true },
        );
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: 'Waitlist joined',
          }),
        );
      });
    });

    it('shows error notification when registration fails', async () => {
      mockedRegistrations().registerForEvent.mockRejectedValue(
        new Error('Something went wrong'),
      );

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Register Now'));
      fireEvent.click(screen.getByRole('button', { name: 'Register' }));

      await waitFor(() => {
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Registration failed',
            message: 'Something went wrong',
          }),
        );
      });
    });

    it('shows Submitting... text while registration is in progress', async () => {
      // Never resolve so button stays in submitting state
      mockedRegistrations().registerForEvent.mockImplementation(
        () => new Promise(() => {}),
      );

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Register Now'));
      fireEvent.click(screen.getByRole('button', { name: 'Register' }));

      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });

    it('closes dialog after successful registration', async () => {
      mockedRegistrations().registerForEvent.mockResolvedValue('reg1');

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Register Now'));
      expect(screen.getByText('Register for Event')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Register' }));

      await waitFor(() => {
        expect(screen.queryByText('Register for Event')).not.toBeInTheDocument();
      });
    });
  });

  // ------------------------------------------------------------------
  // Cancel registration
  // ------------------------------------------------------------------
  describe('cancel registration', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: true,
      });
      mockedRegistrations().getMyRegistrations.mockResolvedValue([
        { id: 'reg1', eventId: 'evt1', status: 'registered' },
      ]);
    });

    it('opens confirm modal then cancels successfully', async () => {
      mockedRegistrations().cancelRegistration.mockResolvedValue(undefined);

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      // Click Cancel in the registered banner
      fireEvent.click(screen.getByText('Cancel'));

      // Confirm modal should appear
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-modal-title')).toHaveTextContent(
        'Unregister from event',
      );

      // Click confirm
      fireEvent.click(screen.getByTestId('confirm-modal-confirm'));

      await waitFor(() => {
        expect(
          mockedRegistrations().cancelRegistration,
        ).toHaveBeenCalledWith('reg1');
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', title: 'Cancelled' }),
        );
      });
    });

    it('closes confirm modal without cancelling', async () => {
      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

      // Click cancel in modal (Keep registration)
      fireEvent.click(screen.getByTestId('confirm-modal-cancel'));

      expect(
        screen.queryByTestId('confirm-modal'),
      ).not.toBeInTheDocument();
      expect(
        mockedRegistrations().cancelRegistration,
      ).not.toHaveBeenCalled();
    });

    it('shows error notification when cancel fails', async () => {
      mockedRegistrations().cancelRegistration.mockRejectedValue(
        new Error('Server error'),
      );

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Cancel'));
      fireEvent.click(screen.getByTestId('confirm-modal-confirm'));

      await waitFor(() => {
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Cancel failed',
          }),
        );
      });
    });
  });

  // ------------------------------------------------------------------
  // Confirm invitation
  // ------------------------------------------------------------------
  describe('confirm invitation', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'user1',
        isMember: true,
      });
      mockedRegistrations().getMyRegistrations.mockResolvedValue([
        {
          id: 'reg1',
          eventId: 'evt1',
          status: 'invited',
          confirmationToken: 'tok123',
        },
      ]);
    });

    it('confirms invitation successfully', async () => {
      mockedRegistrations().confirmRegistration.mockResolvedValue({
        ok: true,
        message: 'Confirmed',
      });

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Confirm spot'));

      await waitFor(() => {
        expect(
          mockedRegistrations().confirmRegistration,
        ).toHaveBeenCalledWith('reg1', 'tok123');
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            title: 'Confirmed',
          }),
        );
      });
    });

    it('shows error notification when confirm fails', async () => {
      mockedRegistrations().confirmRegistration.mockResolvedValue({
        ok: false,
        message: 'Event full',
      });

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Confirm spot'));

      await waitFor(() => {
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Confirm failed',
          }),
        );
      });
    });

    it('shows error notification on network error during confirm', async () => {
      mockedRegistrations().confirmRegistration.mockRejectedValue(
        new Error('Network error'),
      );

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      fireEvent.click(screen.getByText('Confirm spot'));

      await waitFor(() => {
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Confirm failed',
            message: 'Network error',
          }),
        );
      });
    });

    it('renders link for invited user with token missing', async () => {
      mockedRegistrations().getMyRegistrations.mockResolvedValue([
        {
          id: 'reg1',
          eventId: 'evt1',
          status: 'invited',
          // no confirmationToken
        },
      ]);

      render(<EventRegistrationDialog event={createEvent()} />);
      await simulateAuth(mockUser);

      // Confirm spot button should still be present
      expect(screen.getByText('Confirm spot')).toBeInTheDocument();

      // Clicking should fail with token error
      fireEvent.click(screen.getByText('Confirm spot'));

      await waitFor(() => {
        expect(getNotifyMock()).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            title: 'Confirm failed',
          }),
        );
      });
    });
  });
});
