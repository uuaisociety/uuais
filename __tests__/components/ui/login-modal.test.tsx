import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginCard from '@/components/ui/LoginModal';

const mockSignInWithGooglePopup = jest.fn();
const mockSignInWithGithubPopup = jest.fn();
const mockGetUserProfile = jest.fn();
const mockRouterPush = jest.fn();
const mockIsPartnerEmail = jest.fn();
const mockIsEmailSignInLink = jest.fn();
const mockStoredEmailForSignIn = jest.fn();
const mockSendEmailSignInLink = jest.fn();
const mockSignInWithEmailLink = jest.fn();

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    currentUser: { email: 'hr@partner.example', emailVerified: true },
  },
  signInWithGooglePopup: (...args: unknown[]) =>
    mockSignInWithGooglePopup(...args),
  signInWithGithubPopup: (...args: unknown[]) =>
    mockSignInWithGithubPopup(...args),
  isEmailSignInLink: (...args: unknown[]) => mockIsEmailSignInLink(...args),
  storedEmailForSignIn: () => mockStoredEmailForSignIn(),
  emailLinkCooldownSeconds: () => 0,
  sendEmailSignInLink: (...args: unknown[]) => mockSendEmailSignInLink(...args),
  signInWithEmailLinkAfterReady: (...args: unknown[]) =>
    mockSignInWithEmailLink(...args),
}));

jest.mock('@/lib/firestore', () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
  isPartnerEmail: (...args: unknown[]) => mockIsPartnerEmail(...args),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockUser = { uid: 'u1' };

describe('LoginCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserProfile.mockResolvedValue({
      id: 'u1',
      isMember: true,
      privacyAcceptedAt: '2026-01-01T00:00:00Z',
    });
    mockIsPartnerEmail.mockResolvedValue(false);
    mockIsEmailSignInLink.mockReturnValue(false);
    mockStoredEmailForSignIn.mockReturnValue(null);
  });

  it('lets a partner account through without a member profile', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser);
    mockIsPartnerEmail.mockResolvedValue(true);
    mockGetUserProfile.mockResolvedValue(null);
    const after = jest.fn();
    render(<LoginCard after={after} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(after).toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('renders login heading and description', () => {
    render(<LoginCard after={jest.fn()} />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText(/Please login using one/)).toBeInTheDocument();
  });

  it('renders SSO buttons', () => {
    render(<LoginCard after={jest.fn()} />);
    expect(screen.getByText(/Continue with Google/)).toBeInTheDocument();
    expect(screen.getByText(/Continue with GitHub/)).toBeInTheDocument();
  });

  it('renders join link', () => {
    render(<LoginCard after={jest.fn()} />);
    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });

  it('preserves the newsletter return path when choosing account creation', () => {
    window.history.replaceState({}, '', '/login?redirect=%2Fnewsletter');
    render(<LoginCard after={jest.fn()} />);
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/join?redirect=%2Fnewsletter');
    window.history.replaceState({}, '', '/');
  });

  it('renders privacy link', () => {
    render(<LoginCard after={jest.fn()} />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('calls signInWithGooglePopup and after when Google button is clicked', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser);
    const after = jest.fn();
    render(<LoginCard after={after} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(mockSignInWithGooglePopup).toHaveBeenCalledTimes(1);
    expect(mockGetUserProfile).toHaveBeenCalledWith('u1');
    expect(after).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('calls signInWithGithubPopup and after when GitHub button is clicked', async () => {
    mockSignInWithGithubPopup.mockResolvedValue(mockUser);
    const after = jest.fn();
    render(<LoginCard after={after} />);
    await userEvent.click(screen.getByText(/Continue with GitHub/));
    expect(mockSignInWithGithubPopup).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('redirects to /join when the account has not created a profile', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser);
    mockGetUserProfile.mockResolvedValue(null);
    const after = jest.fn();
    render(<LoginCard after={after} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(mockRouterPush).toHaveBeenCalledWith('/join');
    expect(after).not.toHaveBeenCalled();
  });

  it('carries the pending redirect into /join so the detour still ends at the target', async () => {
    window.history.replaceState({}, '', '/login?redirect=%2Fapply%2Fteam');
    mockSignInWithGooglePopup.mockResolvedValue(mockUser);
    mockGetUserProfile.mockResolvedValue(null);
    render(<LoginCard after={jest.fn()} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/join?redirect=%2Fapply%2Fteam',
    );
    window.history.replaceState({}, '', '/');
  });

  it('ignores an off-site redirect when detouring to /join', async () => {
    window.history.replaceState({}, '', '/login?redirect=%2F%2Fevil.com');
    mockSignInWithGooglePopup.mockResolvedValue(mockUser);
    mockGetUserProfile.mockResolvedValue(null);
    render(<LoginCard after={jest.fn()} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(mockRouterPush).toHaveBeenCalledWith('/join');
    window.history.replaceState({}, '', '/');
  });

  it('redirects to /join when the profile is incomplete', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser);
    mockGetUserProfile.mockResolvedValue({ id: 'u1', isMember: true }); // missing privacyAcceptedAt
    const after = jest.fn();
    render(<LoginCard after={after} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(mockRouterPush).toHaveBeenCalledWith('/join');
    expect(after).not.toHaveBeenCalled();
  });

  it('shows an error instead of silently failing when sign-in rejects', async () => {
    mockSignInWithGooglePopup.mockRejectedValue(
      new Error('auth/popup-blocked'),
    );
    const after = jest.fn();
    render(<LoginCard after={after} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(screen.getByRole('alert')).toHaveTextContent('auth/popup-blocked');
    expect(after).not.toHaveBeenCalled();
  });

  it('explains how to get in when the email already has another sign-in method', async () => {
    mockSignInWithGithubPopup.mockRejectedValue(
      Object.assign(
        new Error(
          'Firebase: Error (auth/account-exists-with-different-credential).',
        ),
        {
          code: 'auth/account-exists-with-different-credential',
        },
      ),
    );
    render(<LoginCard after={jest.fn()} />);
    await userEvent.click(screen.getByText(/Continue with GitHub/));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /already has an account that uses a different sign-in method.*Linked Accounts/,
    );
  });

  it('still calls after when the profile lookup fails', async () => {
    mockSignInWithGooglePopup.mockResolvedValue(mockUser);
    mockGetUserProfile.mockRejectedValue(new Error('network'));
    const after = jest.fn();
    render(<LoginCard after={after} />);
    await userEvent.click(screen.getByText(/Continue with Google/));
    expect(after).toHaveBeenCalledTimes(1);
  });

  describe('email sign-in link', () => {
    const LINK = '/login?redirect=%2Fapply&apiKey=k&oobCode=abc&mode=signIn';

    afterEach(() => window.history.replaceState({}, '', '/'));

    it('emails a link that returns to the login page, keeping the redirect', async () => {
      window.history.replaceState({}, '', '/login?redirect=%2Fapply');
      mockSendEmailSignInLink.mockResolvedValue(undefined);
      render(<LoginCard after={jest.fn()} />);

      await userEvent.type(screen.getByLabelText('Email'), 'ada@student.uu.se');
      await userEvent.click(
        screen.getByRole('button', { name: 'Email me a sign-in link' }),
      );

      expect(mockSendEmailSignInLink).toHaveBeenCalledWith(
        'ada@student.uu.se',
        `${window.location.origin}/login?redirect=%2Fapply`,
      );
      expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    });

    it('sends a new account from the link to /join, keeping the redirect', async () => {
      window.history.replaceState({}, '', LINK);
      mockIsEmailSignInLink.mockReturnValue(true);
      mockStoredEmailForSignIn.mockReturnValue('ada@student.uu.se');
      mockSignInWithEmailLink.mockResolvedValue({ uid: 'u2' });
      mockGetUserProfile.mockResolvedValue(null);
      const after = jest.fn();
      render(<LoginCard after={after} />);

      await waitFor(() =>
        expect(mockRouterPush).toHaveBeenCalledWith('/join?redirect=%2Fapply'),
      );
      expect(mockSignInWithEmailLink).toHaveBeenCalledWith(
        'ada@student.uu.se',
        `${window.location.origin}${LINK}`,
      );
      expect(mockGetUserProfile).toHaveBeenCalledWith('u2');
      expect(after).not.toHaveBeenCalled();
      expect(window.location.search).toBe('?redirect=%2Fapply');
    });

    it('lets a member with a finished profile straight through', async () => {
      window.history.replaceState({}, '', LINK);
      mockIsEmailSignInLink.mockReturnValue(true);
      mockStoredEmailForSignIn.mockReturnValue('ada@student.uu.se');
      mockSignInWithEmailLink.mockResolvedValue({ uid: 'u1' });
      const after = jest.fn();
      render(<LoginCard after={after} />);

      await waitFor(() => expect(after).toHaveBeenCalledTimes(1));
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });
});
