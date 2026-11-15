import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import JoinPage from '@/components/pages/JoinPage';

jest.mock('@/lib/firebase-client', () => ({
  signInWithGooglePopup: jest.fn(),
  signInWithGithubPopup: jest.fn(),
  // The email-link form under the provider buttons.
  isEmailSignInLink: jest.fn(() => false),
  storedEmailForSignIn: jest.fn(() => null),
  emailLinkCooldownSeconds: jest.fn(() => 0),
  sendEmailSignInLink: jest.fn(),
  signInWithEmailLinkAfterReady: jest.fn(),
}));

jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn(),
  upsertUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
}));

jest.mock('@/components/ui/Notifications', () => {
  const notify = jest.fn();
  return {
    NotificationsProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useNotify: () => ({ notify }),
  };
});

jest.mock('next/navigation', () => {
  const push = jest.fn();
  return { useRouter: () => ({ push }) };
});

jest.mock('@/utils/seo', () => ({
  updatePageMeta: jest.fn(),
}));

const users = () =>
  jest.requireMock('@/lib/firestore/users') as {
    getUserProfile: jest.Mock;
    upsertUserProfile: jest.Mock;
    updateUserProfile: jest.Mock;
  };
const firebase = () =>
  jest.requireMock('@/lib/firebase-client') as Record<string, jest.Mock>;
const push = () =>
  (
    jest.requireMock('next/navigation') as {
      useRouter: () => { push: jest.Mock };
    }
  ).useRouter().push;
const notify = () =>
  (
    jest.requireMock('@/components/ui/Notifications') as {
      useNotify: () => { notify: jest.Mock };
    }
  ).useNotify().notify;
const admin = () =>
  jest.requireMock('@/hooks/useAdmin') as {
    ensureAuth: jest.Mock;
    refreshProfile: jest.Mock;
    publishProfile: jest.Mock;
  };

const newUser = {
  uid: 'u1',
  email: 'alex@student.uu.se',
  displayName: 'Alex Doe',
};

const signedIn = (state: Record<string, unknown> = {}) =>
  global.__setAdminState?.({
    user: newUser,
    loading: false,
    profileLoading: false,
    profileError: false,
    profile: null,
    cached: null,
    ...state,
  });

const fillAndSubmit = () => {
  fireEvent.click(screen.getByRole('checkbox', { name: /privacy policy/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Create my account' }));
};

describe('JoinPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.__setAdminState?.(null);
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/join');
    users().getUserProfile.mockResolvedValue(null);
    users().upsertUserProfile.mockResolvedValue(undefined);
    users().updateUserProfile.mockResolvedValue(undefined);
  });

  afterAll(() => global.__setAdminState?.(null));

  it('renders the page heading', () => {
    render(<JoinPage />);
    expect(screen.getByText('Join UU AI Society')).toBeInTheDocument();
  });

  it('calls updatePageMeta on mount', () => {
    render(<JoinPage />);
    expect(
      (jest.requireMock('@/utils/seo') as { updatePageMeta: jest.Mock })
        .updatePageMeta,
    ).toHaveBeenCalledWith('Join Us', expect.any(String));
  });

  describe('signed out', () => {
    it('shows step 1 with Google, GitHub and the email form straight away', () => {
      render(<JoinPage />);
      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continue with Google/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Continue with GitHub/ }),
      ).toBeInTheDocument();
      // The email form is part of the page, not a lazily loaded chunk.
      expect(
        screen.getByRole('button', { name: 'Email me a sign-in link' }),
      ).toBeInTheDocument();
    });

    it('starts auth and opens the Google popup on click', async () => {
      firebase().signInWithGooglePopup.mockResolvedValue({ uid: 'u1' });
      render(<JoinPage />);
      fireEvent.click(
        screen.getByRole('button', { name: /Continue with Google/ }),
      );
      await waitFor(() =>
        expect(firebase().signInWithGooglePopup).toHaveBeenCalled(),
      );
      expect(admin().ensureAuth).toHaveBeenCalled();
    });

    it('shows no error when the user closes the popup', async () => {
      firebase().signInWithGooglePopup.mockRejectedValue(
        Object.assign(
          new Error('Firebase: Error (auth/popup-closed-by-user).'),
          {
            code: 'auth/popup-closed-by-user',
          },
        ),
      );
      render(<JoinPage />);
      fireEvent.click(
        screen.getByRole('button', { name: /Continue with Google/ }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /Continue with Google/ }),
        ).toBeEnabled(),
      );
      expect(screen.queryByText(/Firebase/)).not.toBeInTheDocument();
    });

    it('explains a failed popup sign-in in plain words', async () => {
      firebase().signInWithGithubPopup.mockRejectedValue(
        Object.assign(new Error('x'), {
          code: 'auth/account-exists-with-different-credential',
        }),
      );
      render(<JoinPage />);
      fireEvent.click(
        screen.getByRole('button', { name: /Continue with GitHub/ }),
      );
      expect(
        await screen.findByText(/already has an account that uses a different/),
      ).toBeInTheDocument();
    });

    it('emails a sign-in link that returns to /join with the redirect', async () => {
      window.history.replaceState({}, '', '/join?redirect=%2Fapply');
      firebase().sendEmailSignInLink.mockResolvedValue(undefined);
      render(<JoinPage />);
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: 'alex@student.uu.se' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Email me a sign-in link' }),
      );
      await waitFor(() =>
        expect(firebase().sendEmailSignInLink).toHaveBeenCalledWith(
          'alex@student.uu.se',
          `${window.location.origin}/join?redirect=%2Fapply`,
        ),
      );
      expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    });

    it('starts auth right away when opened from an emailed link', () => {
      window.history.replaceState(
        {},
        '',
        '/join?apiKey=k&oobCode=abc&mode=signIn',
      );
      render(<JoinPage />);
      expect(admin().ensureAuth).toHaveBeenCalled();
    });

    it('shows a neutral checking state while a returning session restores', () => {
      global.__setAdminState?.({
        user: null,
        loading: true,
        cached: { uid: 'u1', name: 'Alex' },
      });
      render(<JoinPage />);
      expect(screen.getByText('Checking your account…')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Continue with Google/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe('signed in, no profile yet', () => {
    it('shows the short details form, prefilled with the provider name', () => {
      signedIn();
      render(<JoinPage />);
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
      expect(
        screen.getByText(/Signed in as alex@student.uu.se/),
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Your name/ })).toHaveValue(
        'Alex Doe',
      );
      expect(
        screen.queryByRole('button', { name: /Continue with Google/ }),
      ).not.toBeInTheDocument();
    });

    it('never prefills the name from the email address', () => {
      signedIn({ user: { ...newUser, displayName: null } });
      render(<JoinPage />);
      expect(screen.getByRole('textbox', { name: /Your name/ })).toHaveValue(
        '',
      );
    });

    it('moves focus to the details step', () => {
      signedIn();
      render(<JoinPage />);
      expect(
        screen.getByRole('heading', { name: 'A few details about you' }),
      ).toHaveFocus();
    });

    it('keeps the button enabled and explains a missing privacy acceptance', async () => {
      signedIn();
      render(<JoinPage />);
      const button = screen.getByRole('button', { name: 'Create my account' });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(
        await screen.findByText(/Please accept the privacy policy/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /privacy policy/ }),
      ).toHaveFocus();
      expect(users().upsertUserProfile).not.toHaveBeenCalled();
    });

    it('requires a name', async () => {
      signedIn({ user: { ...newUser, displayName: null } });
      render(<JoinPage />);
      fillAndSubmit();
      expect(
        await screen.findByText('Please enter your name.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Your name/ })).toHaveFocus();
      expect(
        screen.getByRole('textbox', { name: /Your name/ }),
      ).toHaveAttribute('aria-invalid', 'true');
      expect(users().upsertUserProfile).not.toHaveBeenCalled();
    });

    it('creates the profile, publishes it and lands on the welcome view', async () => {
      signedIn();
      render(<JoinPage />);
      fireEvent.change(screen.getByRole('textbox', { name: /Programme/ }), {
        target: { value: 'Computer Science' },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: /newsletter/ }));
      fillAndSubmit();
      await waitFor(() =>
        expect(users().upsertUserProfile).toHaveBeenCalledWith(
          'u1',
          expect.objectContaining({
            name: 'Alex Doe',
            displayName: 'Alex Doe',
            email: 'alex@student.uu.se',
            studentStatus: 'student',
            program: 'Computer Science',
            newsletter: true,
            isMember: true,
            privacyAcceptedAt: expect.any(String),
          }),
        ),
      );
      expect(admin().publishProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', isMember: true, name: 'Alex Doe' }),
      );
      expect(admin().refreshProfile).toHaveBeenCalled();
      expect(push()).toHaveBeenCalledWith('/account?welcome=1');
      expect(notify()).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Account created' }),
      );
      expect(
        screen.getByText(/Account created\. Taking you/),
      ).toBeInTheDocument();
    });

    it('returns to the pending redirect after creating the account', async () => {
      window.history.replaceState({}, '', '/join?redirect=%2Fapply%2Fteam');
      signedIn();
      render(<JoinPage />);
      fillAndSubmit();
      await waitFor(() => expect(push()).toHaveBeenCalledWith('/apply/team'));
    });

    it('updates instead of creating when another tab already created the profile', async () => {
      signedIn();
      users().getUserProfile.mockResolvedValue({
        id: 'u1',
        isMember: true,
        createdAt: '2026-01-01T00:00:00Z',
      });
      render(<JoinPage />);
      fillAndSubmit();
      await waitFor(() => expect(users().updateUserProfile).toHaveBeenCalled());
      expect(users().upsertUserProfile).not.toHaveBeenCalled();
      // isMember is admin-managed once set, so it isn't re-sent.
      expect(users().updateUserProfile.mock.calls[0][1]).not.toHaveProperty(
        'isMember',
      );
    });

    it('shows the save error inline and keeps the form when saving fails', async () => {
      signedIn();
      users().upsertUserProfile.mockRejectedValue(
        Object.assign(new Error('offline'), { code: 'unavailable' }),
      );
      render(<JoinPage />);
      fillAndSubmit();
      expect(
        await screen.findByText(/You seem to be offline/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create my account' }),
      ).toBeEnabled();
      expect(screen.getByRole('textbox', { name: /Your name/ })).toHaveValue(
        'Alex Doe',
      );
      expect(push()).not.toHaveBeenCalled();
    });

    it('stops waiting on a slow save, then finishes by itself when the write lands', async () => {
      jest.useFakeTimers();
      try {
        signedIn();
        let commit: () => void = () => {};
        users().upsertUserProfile.mockReturnValue(
          new Promise<void>((resolve) => {
            commit = resolve;
          }),
        );
        render(<JoinPage />);
        fillAndSubmit();
        expect(
          await screen.findByRole('button', { name: /Creating your account/ }),
        ).toBeInTheDocument();
        await jest.advanceTimersByTimeAsync(15_000);
        expect(
          await screen.findByText(/taking longer than usual/),
        ).toBeInTheDocument();
        expect(push()).not.toHaveBeenCalled();

        await act(async () => {
          commit();
        });
        await waitFor(() =>
          expect(push()).toHaveBeenCalledWith('/account?welcome=1'),
        );
        expect(notify()).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not overwrite an account another tab already finished', async () => {
      signedIn();
      const done = {
        id: 'u1',
        name: 'From Tab Two',
        program: 'Tab Two Programme',
        isMember: true,
        privacyAcceptedAt: '2026-01-01T00:00:00Z',
      };
      users().getUserProfile.mockResolvedValue(done);
      render(<JoinPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(push()).toHaveBeenCalledWith('/account?welcome=1'),
      );
      expect(users().upsertUserProfile).not.toHaveBeenCalled();
      expect(users().updateUserProfile).not.toHaveBeenCalled();
      expect(admin().publishProfile).toHaveBeenCalledWith(done);
    });

    it('re-checks the profile when the tab becomes visible again, at most every 30 s', () => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      try {
        signedIn();
        render(<JoinPage />);
        admin().refreshProfile.mockClear();
        document.dispatchEvent(new Event('visibilitychange'));
        expect(admin().refreshProfile).not.toHaveBeenCalled();
        now.mockReturnValue(1_031_000);
        document.dispatchEvent(new Event('visibilitychange'));
        expect(admin().refreshProfile).toHaveBeenCalledTimes(1);
      } finally {
        now.mockRestore();
      }
    });

    it('trims a very long provider name to what the rules accept', () => {
      signedIn({ user: { ...newUser, displayName: 'A'.repeat(120) } });
      render(<JoinPage />);
      expect(screen.getByRole('textbox', { name: /Your name/ })).toHaveValue(
        'A'.repeat(100),
      );
    });

    it('shows the welcome on /account when the detour started there', async () => {
      window.history.replaceState({}, '', '/join?redirect=%2Faccount');
      signedIn();
      render(<JoinPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(push()).toHaveBeenCalledWith('/account?welcome=1'),
      );
    });

    it('restores what was typed after a reload', () => {
      signedIn();
      const { unmount } = render(<JoinPage />);
      fireEvent.change(screen.getByRole('textbox', { name: /Your name/ }), {
        target: { value: 'Alexandra' },
      });
      unmount();
      render(<JoinPage />);
      expect(screen.getByRole('textbox', { name: /Your name/ })).toHaveValue(
        'Alexandra',
      );
    });

    it('hides the programme field for non-students', () => {
      signedIn();
      render(<JoinPage />);
      fireEvent.change(screen.getByRole('combobox', { name: 'I am a' }), {
        target: { value: 'alumni' },
      });
      expect(
        screen.queryByRole('textbox', { name: /Programme/ }),
      ).not.toBeInTheDocument();
    });

    it('asks who referred them and saves it', async () => {
      signedIn();
      render(<JoinPage />);
      fireEvent.change(
        screen.getByRole('combobox', { name: /How did you hear/ }),
        { target: { value: 'referral' } },
      );
      fireEvent.change(screen.getByRole('textbox', { name: /Who told you/ }), {
        target: { value: 'Ada Lovelace' },
      });
      fillAndSubmit();
      await waitFor(() =>
        expect(users().upsertUserProfile).toHaveBeenCalledWith(
          'u1',
          expect.objectContaining({
            heardOfUs: 'referral',
            referredBy: 'Ada Lovelace',
          }),
        ),
      );
    });

    it('saves a free-text answer for "Other"', async () => {
      signedIn();
      render(<JoinPage />);
      fireEvent.change(
        screen.getByRole('combobox', { name: /How did you hear/ }),
        { target: { value: 'other' } },
      );
      fireEvent.change(screen.getByRole('textbox', { name: /Where\?/ }), {
        target: { value: 'Reddit' },
      });
      fillAndSubmit();
      await waitFor(() =>
        expect(users().upsertUserProfile).toHaveBeenCalledWith(
          'u1',
          expect.objectContaining({ heardOfUs: 'Reddit' }),
        ),
      );
    });

    it('limits the programme to what the Firestore rules accept', () => {
      signedIn();
      render(<JoinPage />);
      expect(
        screen.getByRole('textbox', { name: /Programme/ }),
      ).toHaveAttribute('maxLength', '150');
    });
  });

  describe('other signed-in states', () => {
    it('tells an existing member they are already a member', () => {
      signedIn({
        profile: {
          id: 'u1',
          displayName: 'Alex',
          isMember: true,
          privacyAcceptedAt: '2026-01-01T00:00:00Z',
        },
      });
      render(<JoinPage />);
      expect(screen.getByText("You're already a member")).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Go to my account' }),
      ).toHaveAttribute('href', '/account');
      expect(
        screen.queryByRole('button', { name: 'Create my account' }),
      ).not.toBeInTheDocument();
    });

    it('offers to continue to the pending redirect for an existing member', () => {
      window.history.replaceState({}, '', '/join?redirect=%2Fevents%2Fe1');
      signedIn({
        profile: {
          id: 'u1',
          isMember: true,
          privacyAcceptedAt: '2026-01-01T00:00:00Z',
        },
      });
      render(<JoinPage />);
      expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute(
        'href',
        '/events/e1',
      );
    });

    it('prefills a half-finished profile', () => {
      signedIn({
        profile: {
          id: 'u1',
          name: 'Alex Old',
          program: 'Physics',
          isMember: true,
        },
      });
      render(<JoinPage />);
      expect(screen.getByRole('textbox', { name: /Your name/ })).toHaveValue(
        'Alex Old',
      );
      expect(screen.getByRole('textbox', { name: /Programme/ })).toHaveValue(
        'Physics',
      );
    });

    it('shows a loading state while the profile loads', () => {
      signedIn({ profileLoading: true });
      render(<JoinPage />);
      expect(screen.getByText('Loading your account…')).toBeInTheDocument();
    });

    it('offers a retry instead of an empty form when the profile read failed', () => {
      signedIn({ profileError: true });
      render(<JoinPage />);
      expect(
        screen.getByText(/couldn.t load your account/),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Create my account' }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Try again now' }));
      expect(admin().refreshProfile).toHaveBeenCalled();
    });
  });
});
