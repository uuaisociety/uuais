import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import AccountPage from '@/app/account/page';
import { updatePageMeta } from '@/utils/seo';

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
    currentUser: null,
    signOut: jest.fn(() => Promise.resolve()),
  },
  linkGoogleToCurrentUser: jest.fn(() => Promise.resolve()),
  linkGithubToCurrentUser: jest.fn(() => Promise.resolve()),
  refreshSessionCookie: jest.fn(() => Promise.resolve()),
}));

const mockGetMyCv = jest.fn<Promise<unknown>, unknown[]>(() =>
  Promise.resolve(null),
);

jest.mock('@/lib/firestore', () => ({
  getUserProfile: jest.fn(),
  upsertUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  getMyRegistrations: jest.fn(),
  getAllEvents: jest.fn(),
  getMyCv: (...args: unknown[]) => mockGetMyCv(...args),
}));

// The page reads the user and profile from the shared auth store. This stand-in
// drives it from the same auth/profile mocks, and applies published profiles.
jest.mock('@/hooks/useAdmin', () => {
  const React = jest.requireActual('react');
  const holder: { set: ((fn: (s: object) => object) => void) | null } = {
    set: null,
  };
  return {
    refreshProfile: jest.fn().mockResolvedValue(undefined),
    ensureAuth: jest.fn(),
    publishProfile: jest.fn((profile: object) =>
      holder.set?.((st) => ({ ...st, profile })),
    ),
    useAdmin: () => {
      const [state, setState] = React.useState({
        user: null,
        loading: true,
        profile: null,
        profileLoading: false,
        profileError: false,
        isPartner: false,
      });
      holder.set = setState;
      React.useEffect(() => {
        const { auth } = jest.requireMock('@/lib/firebase-client');
        const { getUserProfile } = jest.requireMock('@/lib/firestore');
        return auth.onAuthStateChanged(async (u: { uid: string } | null) => {
          if (!u) {
            setState((st: object) => ({ ...st, user: null, loading: false }));
            return;
          }
          setState((st: object) => ({
            ...st,
            user: u,
            loading: false,
            profileLoading: true,
          }));
          try {
            const profile = await getUserProfile(u.uid);
            setState((st: object) => ({
              ...st,
              profile,
              profileLoading: false,
            }));
          } catch {
            setState((st: object) => ({
              ...st,
              profileLoading: false,
              profileError: true,
            }));
          }
        });
      }, []);
      return state;
    },
  };
});

jest.mock('@/lib/firestore/registrations', () => ({
  cancelRegistration: jest.fn(),
  confirmRegistration: jest.fn(),
  declineRegistration: jest.fn(),
}));

const mockNotify = jest.fn();
jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: mockNotify }),
}));

jest.mock('vanilla-cookieconsent', () => ({ showPreferences: jest.fn() }));

jest.mock('@/components/ui/LoginModal', () => ({
  __esModule: true,
  default: () => <div data-testid="login-modal">Login Modal</div>,
}));

jest.mock('@/components/ui/ConfirmModal', () => ({
  __esModule: true,
  default: ({
    open,
    title,
    description,
    onConfirm,
    onClose,
  }: {
    open: boolean;
    title?: string;
    description?: string;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-modal" data-title={title}>
        <p>{description}</p>
        <button data-testid="modal-confirm" onClick={onConfirm}>
          Confirm
        </button>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import * as firebaseClient from '@/lib/firebase-client';
import {
  getUserProfile,
  getMyRegistrations,
  getAllEvents,
  updateUserProfile,
} from '@/lib/firestore';
import {
  cancelRegistration,
  confirmRegistration,
  declineRegistration,
} from '@/lib/firestore/registrations';
import * as CookieConsent from 'vanilla-cookieconsent';

const auth = firebaseClient.auth as unknown as {
  onAuthStateChanged: jest.Mock;
  currentUser: unknown;
  signOut: jest.Mock;
};
const admin = () =>
  jest.requireMock('@/hooks/useAdmin') as {
    publishProfile: jest.Mock;
    refreshProfile: jest.Mock;
  };

const mockUser = {
  uid: 'user-123',
  email: 'alex@student.uu.se',
  providerData: [{ providerId: 'google.com' }],
  reload: jest.fn(),
};

const member: Record<string, unknown> = {
  id: 'user-123',
  isMember: true,
  privacyAcceptedAt: '2025-01-01T00:00:00Z',
  createdAt: '2025-01-01T00:00:00Z',
  name: 'Alex Doe',
  displayName: 'Alex',
  studentStatus: 'student',
  program: 'Computer Science',
  linkedin: 'https://linkedin.com/in/alex',
  newsletter: true,
  partnerContactOptIn: false,
};

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const events = [
  {
    id: 'e1',
    title: 'AI Workshop',
    published: true,
    eventStartAt: inDays(5),
    category: 'workshop',
    location: 'Ångström',
  },
  {
    id: 'e2',
    title: 'Guest Lecture',
    published: true,
    eventStartAt: inDays(9),
  },
  {
    id: 'old',
    title: 'Past Event',
    published: true,
    eventStartAt: '2024-01-01T00:00:00Z',
  },
];
const reg = (id: string, eventId: string, status: string, extra = {}) => ({
  id,
  eventId,
  status,
  userId: 'user-123',
  registeredAt: '2025-05-01T12:00:00Z',
  registrationData: {},
  ...extra,
});

const signIn = (
  user: unknown = mockUser,
  profile: unknown = member,
  regs: unknown[] = [],
) => {
  auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
    cb(user);
    return jest.fn();
  });
  auth.currentUser = user;
  (getUserProfile as jest.Mock).mockResolvedValue(profile);
  (getMyRegistrations as jest.Mock).mockResolvedValue(regs);
  (getAllEvents as jest.Mock).mockResolvedValue(events);
};

const renderPage = async () => {
  render(<AccountPage />);
  await screen.findByRole('tablist');
};

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({}, '', '/account');
  mockGetMyCv.mockResolvedValue(null);
  (updateUserProfile as jest.Mock).mockResolvedValue(undefined);
});

describe('AccountPage states', () => {
  it('shows a loading state while auth resolves', () => {
    auth.onAuthStateChanged.mockImplementation(() => jest.fn());
    render(<AccountPage />);
    expect(screen.getByText('Loading your account…')).toBeInTheDocument();
  });

  it('shows the login form when signed out', () => {
    signIn(null);
    render(<AccountPage />);
    expect(screen.getByTestId('login-modal')).toBeInTheDocument();
  });

  it('offers a retry when the profile cannot be loaded', async () => {
    signIn();
    (getUserProfile as jest.Mock).mockRejectedValue(new Error('offline'));
    render(<AccountPage />);
    expect(
      await screen.findByText(/couldn.t load your account/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again now' }));
    expect(admin().refreshProfile).toHaveBeenCalled();
  });

  it('points an unfinished account to /join', async () => {
    signIn(mockUser, null);
    render(<AccountPage />);
    expect(
      await screen.findByRole('link', { name: 'Finish creating your account' }),
    ).toHaveAttribute('href', '/join?redirect=%2Faccount');
  });

  it('sets the page meta', async () => {
    signIn();
    await renderPage();
    expect(updatePageMeta).toHaveBeenCalledWith(
      'My Account',
      'Manage your UU AI Society account and event registrations',
    );
  });
});

describe('identity band', () => {
  it('shows the name, membership and email', async () => {
    signIn();
    await renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Alex' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(
      screen.getByText(/alex@student\.uu\.se · since/),
    ).toBeInTheDocument();
  });

  it('welcomes a new member once and drops ?welcome=1', async () => {
    signIn();
    window.history.replaceState({}, '', '/account?welcome=1');
    await renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Welcome, Alex' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/You’re now a member/)).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('measures the profile and names what is missing', async () => {
    signIn();
    await renderPage();
    const meter = screen.getByRole('meter', { name: 'Profile completeness' });
    // Name, display name, status, programme and LinkedIn are set; no CV yet.
    expect(meter).toHaveAttribute('aria-valuenow', '5');
    expect(
      screen.getByRole('button', {
        name: 'Add graduation year, bio and GitHub or website',
      }),
    ).toBeInTheDocument();
  });

  it('opens the first missing field from the meter link', async () => {
    signIn();
    await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: /^Add graduation year/ }),
    );
    expect(screen.getByLabelText('Expected graduation')).toHaveFocus();
  });
});

describe('tabs', () => {
  it('starts on Profile and switches with the URL hash', async () => {
    signIn();
    await renderPage();
    expect(screen.getByRole('tab', { name: 'Profile' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('tab', { name: /Sign-in & privacy/ }));
    expect(window.location.hash).toBe('#settings');
    expect(
      screen.getByRole('tabpanel', { name: /Sign-in & privacy/ }),
    ).toBeVisible();
    expect(document.getElementById('panel-profile')).toHaveAttribute('hidden');
  });

  it('opens the tab named in the hash on load', async () => {
    signIn();
    window.history.replaceState({}, '', '/account#events');
    await renderPage();
    expect(screen.getByRole('tab', { name: 'Events' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('moves between tabs with the arrow keys', async () => {
    signIn();
    await renderPage();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Profile' }), {
      key: 'ArrowRight',
    });
    expect(screen.getByRole('tab', { name: /CV for partners/ })).toHaveFocus();
    expect(window.location.hash).toBe('#cv');
  });

  it('shows the CV state and pending invites on the tab labels', async () => {
    signIn(mockUser, member, [
      reg('r1', 'e1', 'invited', { confirmationToken: 't' }),
    ]);
    await renderPage();
    expect(
      await screen.findByRole('tab', { name: /CV for partners not shared/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('tab', { name: /Events 1 invite/ }),
    ).toBeInTheDocument();
  });
});

describe('profile rows', () => {
  it('lists the profile with Not set for unanswered fields, never made-up defaults', async () => {
    signIn();
    await renderPage();
    expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getAllByText('Not set').length).toBeGreaterThan(3);
    expect(screen.queryByText('Uppsala')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'linkedin.com/in/alex' }),
    ).toHaveAttribute('href', 'https://linkedin.com/in/alex');
  });

  it('edits and saves one field on its own', async () => {
    signIn();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit full name' }));
    const input = screen.getByLabelText('Full name');
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: '  Alex Lindqvist ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
        name: 'Alex Lindqvist',
      }),
    );
    expect(admin().publishProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-123', name: 'Alex Lindqvist' }),
    );
    expect(await screen.findByText('Alex Lindqvist')).toBeInTheDocument();
  });

  it('returns focus to the row after the editor closes', async () => {
    signIn();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit full name' }));
    fireEvent.keyDown(screen.getByLabelText('Full name'), { key: 'Escape' });
    expect(
      screen.getByRole('button', { name: 'Edit full name' }),
    ).toHaveFocus();
  });

  it('adds https:// to a bare web address and refuses other schemes', async () => {
    signIn();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Add github' }));
    fireEvent.change(screen.getByLabelText('GitHub'), {
      target: { value: 'github.com/alex' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
        github: 'https://github.com/alex',
      }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Add website' }));
    fireEvent.change(screen.getByLabelText('Website'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByLabelText('Website')).toBeInTheDocument();
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Enter a web address starting with https://',
      }),
    );
    expect(updateUserProfile).toHaveBeenCalledTimes(1);
  });

  it('cancels an edit with Escape without saving', async () => {
    signIn();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit full name' }));
    fireEvent.keyDown(screen.getByLabelText('Full name'), { key: 'Escape' });
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('keeps the editor open and says so when saving fails', async () => {
    signIn();
    (updateUserProfile as jest.Mock).mockRejectedValue(new Error('denied'));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Add bio' }));
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', title: 'Not saved' }),
      ),
    );
    expect(screen.getByLabelText('Bio')).toHaveValue('Hi');
  });

  it('limits fields to what the Firestore rules accept', async () => {
    signIn();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit programme' }));
    expect(screen.getByLabelText('Programme')).toHaveAttribute(
      'maxLength',
      '150',
    );
    fireEvent.keyDown(screen.getByLabelText('Programme'), { key: 'Escape' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Add expected graduation' }),
    );
    expect(screen.getByLabelText('Expected graduation')).toHaveAttribute(
      'min',
      '1950',
    );
  });

  it('asks who referred them and clears the referrer when the source changes', async () => {
    signIn();
    await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Add how you found us' }),
    );
    fireEvent.change(screen.getByLabelText('How you found us'), {
      target: { value: 'referral' },
    });
    fireEvent.change(screen.getByLabelText('Who told you?'), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
        heardOfUs: 'referral',
        referredBy: 'Ada Lovelace',
      }),
    );
    expect(
      await screen.findByText('Referral · Ada Lovelace'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit how you found us' }),
    );
    fireEvent.change(screen.getByLabelText('How you found us'), {
      target: { value: 'posters' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateUserProfile).toHaveBeenLastCalledWith('user-123', {
        heardOfUs: 'posters',
        referredBy: '',
      }),
    );
  });

  it('saves a free-text answer for "Other"', async () => {
    signIn();
    await renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Add how you found us' }),
    );
    fireEvent.change(screen.getByLabelText('How you found us'), {
      target: { value: 'other' },
    });
    fireEvent.change(screen.getByLabelText('Where did you hear of us?'), {
      target: { value: 'Reddit' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateUserProfile).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ heardOfUs: 'Reddit' }),
      ),
    );
  });
});

describe('events', () => {
  const regs = [
    reg('r1', 'e1', 'invited', { confirmationToken: 'tok' }),
    reg('r2', 'e2', 'registered'),
    reg('r3', 'old', 'registered'),
  ];

  it('lists upcoming applications with their status and drops past events', async () => {
    signIn(mockUser, member, regs);
    await renderPage();
    const aside = screen.getByRole('complementary');
    expect(
      await within(aside).findByText('Needs your answer'),
    ).toBeInTheDocument();
    expect(within(aside).getByText('Invited')).toBeInTheDocument();
    expect(within(aside).getByText('Registered')).toBeInTheDocument();
    expect(within(aside).getByText(/^Workshop · /)).toBeInTheDocument();
    expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
  });

  it('confirms an invited spot', async () => {
    signIn(mockUser, member, regs);
    (confirmRegistration as jest.Mock).mockResolvedValue({ ok: true });
    await renderPage();
    fireEvent.click(
      await within(screen.getByRole('complementary')).findByRole('button', {
        name: 'Confirm my spot',
      }),
    );
    await waitFor(() =>
      expect(confirmRegistration).toHaveBeenCalledWith('r1', 'tok'),
    );
  });

  it('cancels a registration after confirmation, naming the event', async () => {
    signIn(mockUser, member, regs);
    (cancelRegistration as jest.Mock).mockResolvedValue(undefined);
    await renderPage();
    fireEvent.click(
      await within(screen.getByRole('complementary')).findByRole('button', {
        name: 'Cancel Guest Lecture',
      }),
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });
    expect(cancelRegistration).toHaveBeenCalledWith('r2');
  });

  it('declines an invitation rather than cancelling it', async () => {
    signIn(mockUser, member, regs);
    (declineRegistration as jest.Mock).mockResolvedValue(undefined);
    await renderPage();
    fireEvent.click(
      await within(screen.getByRole('complementary')).findByRole('button', {
        name: 'Decline AI Workshop',
      }),
    );
    expect(screen.getByTestId('confirm-modal')).toHaveAttribute(
      'data-title',
      'Decline invitation',
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });
    expect(declineRegistration).toHaveBeenCalledWith('r1');
    expect(cancelRegistration).not.toHaveBeenCalled();
  });

  it('shows an empty state with a link to events', async () => {
    signIn();
    await renderPage();
    expect(
      await within(screen.getByRole('complementary')).findByText(
        /haven.t applied to any upcoming events yet/,
      ),
    ).toBeInTheDocument();
  });

  it('keeps the page usable when applications fail to load, with a retry', async () => {
    signIn();
    (getMyRegistrations as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([]);
    await renderPage();
    const aside = screen.getByRole('complementary');
    expect(
      await within(aside).findByText(/couldn.t load your event applications/),
    ).toBeInTheDocument();
    expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    fireEvent.click(within(aside).getByRole('button', { name: 'Try again' }));
    expect(
      await within(aside).findByText(
        /haven.t applied to any upcoming events yet/,
      ),
    ).toBeInTheDocument();
  });
});

describe('sign-in & privacy', () => {
  const openSettings = async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Sign-in & privacy/ }));
  };

  it('lists sign-in methods and links a missing one', async () => {
    signIn();
    await openSettings();
    const panel = screen.getByRole('tabpanel', { name: /Sign-in & privacy/ });
    expect(within(panel).getByText('Linked')).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'Link GitHub' }));
    await waitFor(() =>
      expect(firebaseClient.linkGithubToCurrentUser).toHaveBeenCalled(),
    );
  });

  it('shows the email link method for email-link members', async () => {
    signIn({ ...mockUser, providerData: [{ providerId: 'password' }] });
    await openSettings();
    expect(screen.getByText(/^Email link/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Link Google' }),
    ).toBeInTheDocument();
  });

  it('saves a preference as soon as it is switched', async () => {
    signIn();
    await openSettings();
    const newsletter = screen.getByRole('switch', { name: /Newsletter/ });
    expect(newsletter).toBeChecked();
    fireEvent.click(newsletter);
    await waitFor(() =>
      expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
        newsletter: false,
      }),
    );
  });

  it('moves a switch at once and ignores repeat clicks while it saves', async () => {
    signIn();
    let finishWrite: () => void = () => {};
    (updateUserProfile as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        finishWrite = resolve;
      }),
    );
    await openSettings();
    const newsletter = screen.getByRole('switch', { name: /Newsletter/ });
    fireEvent.click(newsletter);
    expect(newsletter).not.toBeChecked();
    expect(newsletter).toBeDisabled();
    expect(newsletter).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(newsletter);
    expect(updateUserProfile).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishWrite();
    });
    expect(newsletter).toBeEnabled();
  });

  it('says a timed-out save is still pending and re-reads once it lands', async () => {
    jest.useFakeTimers();
    try {
      signIn();
      let finishWrite: () => void = () => {};
      (updateUserProfile as jest.Mock).mockReturnValue(
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
      );
      await openSettings();
      fireEvent.click(screen.getByRole('switch', { name: /Newsletter/ }));
      await act(async () => {
        await jest.advanceTimersByTimeAsync(20_000);
      });
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Still saving' }),
      );
      admin().refreshProfile.mockClear();
      await act(async () => {
        finishWrite();
      });
      expect(admin().refreshProfile).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('describes a switch through aria-describedby, not its name', async () => {
    signIn();
    await openSettings();
    const newsletter = screen.getByRole('switch', { name: 'Newsletter' });
    expect(newsletter).toHaveAccessibleDescription(
      'Events and news from the society.',
    );
  });

  it('locks partner contact on while a CV is shared, explaining why', async () => {
    signIn();
    mockGetMyCv.mockResolvedValue({
      id: 'user-123',
      path: 'cvs/user-123/cv.pdf',
      fileName: 'cv.pdf',
      size: 1000,
      uploadedAt: '2026-10-28T10:00:00.000Z',
      consentAt: '2026-10-28T10:00:00.000Z',
      consentVersion: '2026-10-28.2',
    });
    await openSettings();
    const box = screen.getByRole('switch', {
      name: /Contact from partner companies/,
    });
    await waitFor(() => expect(box).toBeDisabled());
    expect(box).toBeChecked();
    expect(
      screen.getByText(/Remove your CV to turn this off/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /CV for partners shared/ }),
    ).toBeInTheDocument();
  });

  it('opens cookie preferences', async () => {
    signIn();
    await openSettings();
    fireEvent.click(
      screen.getByRole('button', { name: 'Change cookie settings' }),
    );
    expect(CookieConsent.showPreferences).toHaveBeenCalled();
  });

  it('deletes the account after confirmation and signs out', async () => {
    signIn();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    await openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.getByTestId('confirm-modal')).toHaveAttribute(
      'data-title',
      'Delete account',
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/account/delete', {
      method: 'POST',
    });
    // The session cookie is re-minted for this user before the deletion request.
    const refresh = (
      firebaseClient as unknown as { refreshSessionCookie: jest.Mock }
    ).refreshSessionCookie;
    expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0],
    );
    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
  });

  it('surfaces the server error when deletion fails', async () => {
    signIn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Deletion unavailable' }),
    }) as unknown as typeof fetch;
    await openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-confirm'));
    });
    await waitFor(() =>
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Deletion unavailable' }),
      ),
    );
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
