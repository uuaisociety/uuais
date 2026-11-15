import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { updatePageMeta } from '@/utils/seo';

jest.mock('@/components/ui/LoginModal', () => ({
  __esModule: true,
  default: ({ after }: { after: () => void }) => (
    <div data-testid="login-modal">
      <p>Sign In Modal</p>
      <button onClick={after}>Mock Sign In</button>
    </div>
  ),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.__setAdminState?.(null);
  });

  it('renders the login modal', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('login-modal')).toBeInTheDocument();
  });

  it('renders mock modal content', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign In Modal')).toBeInTheDocument();
  });

  it('calls updatePageMeta with correct title and description', () => {
    render(<LoginPage />);
    expect(updatePageMeta).toHaveBeenCalledWith(
      'Sign In',
      'Sign in to your UU AI Society account',
    );
  });

  it('calls updatePageMeta exactly once on mount', () => {
    render(<LoginPage />);
    expect(updatePageMeta).toHaveBeenCalledTimes(1);
  });

  it('shows a finish-account prompt for a signed-in user without a profile', () => {
    global.__setAdminState?.({
      user: { uid: 'u1', email: 'a@b.se' },
      profileLoading: false,
      profile: null,
    });
    render(<LoginPage />);
    expect(
      screen.getByText(/your account isn’t finished yet/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Finish creating your account' }),
    ).toHaveAttribute('href', '/join');
    expect(screen.queryByTestId('login-modal')).not.toBeInTheDocument();
    global.__setAdminState?.(null);
  });

  it('keeps the pending redirect on the finish-account link', () => {
    window.history.replaceState({}, '', '/login?redirect=%2Fapply%2Fteam');
    global.__setAdminState?.({
      user: { uid: 'u1' },
      profileLoading: false,
      profile: null,
    });
    render(<LoginPage />);
    expect(
      screen.getByRole('link', { name: 'Finish creating your account' }),
    ).toHaveAttribute('href', '/join?redirect=%2Fapply%2Fteam');
    global.__setAdminState?.(null);
    window.history.replaceState({}, '', '/');
  });

  it('tells a signed-in member they are signed in and links to their account', () => {
    global.__setAdminState?.({
      user: { uid: 'u1', email: 'alex@example.com' },
      profileLoading: false,
      profile: {
        id: 'u1',
        displayName: 'Alex',
        isMember: true,
        privacyAcceptedAt: '2026-01-01T00:00:00Z',
      },
    });
    render(<LoginPage />);
    expect(screen.getByText(/You're signed in as Alex\./)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to my account' }),
    ).toHaveAttribute('href', '/account');
    expect(
      screen.getByRole('button', { name: 'Sign out' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/isn’t finished/)).not.toBeInTheDocument();
    global.__setAdminState?.(null);
  });

  it('does not call a member unregistered when their profile failed to load', () => {
    global.__setAdminState?.({
      user: { uid: 'u1' },
      profileLoading: false,
      profileError: true,
      profile: null,
    });
    render(<LoginPage />);
    expect(screen.queryByText(/isn’t finished/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to my account' }),
    ).toBeInTheDocument();
    global.__setAdminState?.(null);
  });
});
