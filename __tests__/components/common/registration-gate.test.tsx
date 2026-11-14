import { render, screen } from '@testing-library/react';
import RegistrationGate from '@/components/auth/RegistrationGate';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const unsubscribe = jest.fn();

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn(() => unsubscribe),
  },
}));

jest.mock('@/lib/firestore', () => ({
  getUserProfile: jest.fn(),
}));

// Mutable admin state so tests can simulate signed-in members (the global jest.setup.ts mock only covers the anonymous case).
const mockAdminState = {
  user: null,
  loading: false,
  profileLoading: false,
  profileError: false,
  profile: null,
  isAdmin: false,
  isSuperAdmin: false,
  isPartner: false,
  claims: null,
  signInWithGoogle: jest.fn(),
  logout: jest.fn(),
};

jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => mockAdminState,
  refreshProfile: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => global.__mockPathname || '',
}));

describe('RegistrationGate', () => {
  const member = {
    id: 'u1',
    isMember: true,
    privacyAcceptedAt: '2026-01-01T00:00:00Z',
  };
  const signedInWithout = (profile: unknown = null) =>
    Object.assign(mockAdminState, {
      user: { uid: 'u1' },
      profileLoading: false,
      profile,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    global.__mockPathname = '/';
    window.history.replaceState({}, '', '/');
    Object.assign(mockAdminState, {
      user: null,
      loading: false,
      profileLoading: false,
      profileError: false,
      profile: null,
      isAdmin: false,
      isSuperAdmin: false,
      isPartner: false,
      claims: null,
    });
  });

  it('renders nothing for anonymous visitors', () => {
    global.__mockPathname = '/account';
    const { container } = render(<RegistrationGate />);
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders nothing for a member with a complete profile', () => {
    Object.assign(mockAdminState, { user: { uid: 'u1' }, profile: member });
    global.__mockPathname = '/account';
    const { container } = render(<RegistrationGate />);
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('never signs anyone out', () => {
    signedInWithout();
    for (const path of ['/account', '/events', '/join', '/login']) {
      global.__mockPathname = path;
      render(<RegistrationGate />);
    }
    expect(mockAdminState.logout).not.toHaveBeenCalled();
  });

  it('sends an unfinished account on a member-only page to /join, keeping the page', () => {
    signedInWithout();
    global.__mockPathname = '/account';
    window.history.replaceState({}, '', '/account?tab=cv');
    render(<RegistrationGate />);
    expect(mockReplace).toHaveBeenCalledWith(
      '/join?redirect=%2Faccount%3Ftab%3Dcv',
    );
  });

  it('reminds an unfinished account on public pages instead of redirecting', () => {
    signedInWithout({ id: 'u1', isMember: true }); // missing privacyAcceptedAt
    global.__mockPathname = '/events';
    render(<RegistrationGate />);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(
      screen.getByRole('link', { name: 'Finish creating your account' }),
    ).toHaveAttribute('href', '/join?redirect=%2Fevents');
  });

  it('does not send a home-page joiner back to the home page', () => {
    signedInWithout();
    global.__mockPathname = '/';
    render(<RegistrationGate />);
    expect(
      screen.getByRole('link', { name: 'Finish creating your account' }),
    ).toHaveAttribute('href', '/join');
  });

  it.each(['/join', '/login', '/privacy'])('stays quiet on %s', (path) => {
    signedInWithout();
    global.__mockPathname = path;
    const { container } = render(<RegistrationGate />);
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves partner accounts alone, which have no member profile by design', () => {
    signedInWithout();
    mockAdminState.isPartner = true;
    global.__mockPathname = '/partners/cvs';
    const { container } = render(<RegistrationGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it('waits for the profile lookup before deciding', () => {
    signedInWithout();
    mockAdminState.profileLoading = true;
    global.__mockPathname = '/account';
    const { container } = render(<RegistrationGate />);
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('treats a failed profile read as unknown, not unregistered', () => {
    signedInWithout();
    mockAdminState.profileError = true;
    global.__mockPathname = '/account';
    const { container } = render(<RegistrationGate />);
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockAdminState.logout).not.toHaveBeenCalled();
  });
});
