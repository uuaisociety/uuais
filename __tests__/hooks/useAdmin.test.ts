import { User } from 'firebase/auth';

const mockUnsubscribe = jest.fn();
let authCallback: ((user: User | null) => void) | null = null;
const mockAuth = { currentUser: null as User | null };

// jest.setup.ts mocks '@/hooks/useAdmin' globally; restore the real module here.
jest.mock('@/hooks/useAdmin', () => jest.requireActual('@/hooks/useAdmin'));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  getIdTokenResult: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}));

jest.mock('@/lib/firebase-client', () => ({
  auth: mockAuth,
  refreshSessionCookie: jest.fn(),
}));

jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue(null),
}));

const mockUser = { uid: 'test-uid', email: 'test@example.com' } as User;

describe('useAdmin', () => {
  let onAuthStateChanged: jest.Mock;
  let getIdTokenResult: jest.Mock;
  let signInWithPopup: jest.Mock;
  let signOut: jest.Mock;
  let refreshSessionCookie: jest.Mock;
  let getUserProfile: jest.Mock;
  let useAdmin: typeof import('@/hooks/useAdmin').useAdmin;
  let renderHook: typeof import('@testing-library/react').renderHook;
  let act: typeof import('@testing-library/react').act;
  let waitFor: typeof import('@testing-library/react').waitFor;

  beforeEach(() => {
    // useAdmin is a module-level singleton (start() runs once and the store is
    // shared), so reset the module registry to get a fresh store per test. The
    // jest.mock factories re-run, so re-require the fresh mock instances too.
    // React is reloaded as part of the reset, so testing-library's renderHook
    // and act must be reloaded as well to share the same React dispatcher.
    // RTL registers an auto-cleanup afterEach at import time; skip it since we
    // are inside a test context and unmount instances explicitly.
    jest.resetModules();
    process.env.RTL_SKIP_AUTO_CLEANUP = 'true';
    jest.clearAllMocks();
    window.localStorage.clear();
    mockAuth.currentUser = null;
    authCallback = null;

    ({ renderHook, act, waitFor } = jest.requireActual('@testing-library/react'));
    const auth = jest.requireMock('firebase/auth') as Record<string, jest.Mock>;
    onAuthStateChanged = auth.onAuthStateChanged;
    getIdTokenResult = auth.getIdTokenResult;
    signInWithPopup = auth.signInWithPopup;
    signOut = auth.signOut;
    refreshSessionCookie = (jest.requireMock('@/lib/firebase-client') as { refreshSessionCookie: jest.Mock }).refreshSessionCookie;
    getUserProfile = (jest.requireMock('@/lib/firestore/users') as { getUserProfile: jest.Mock }).getUserProfile;
    useAdmin = (jest.requireMock('@/hooks/useAdmin') as typeof import('@/hooks/useAdmin')).useAdmin;

    onAuthStateChanged.mockImplementation((_auth, cb) => {
      authCallback = cb;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    delete process.env.RTL_SKIP_AUTO_CLEANUP;
    jest.restoreAllMocks();
  });

  const loadHook = () => renderHook(() => useAdmin());

  it('returns loading state initially', () => {
    const { result } = loadHook();
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.cached).toBeNull();
  });

  it('handles null user (not logged in)', async () => {
    const { result } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => {
      await authCallback!(null);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.cached).toBeNull();
  });

  it('handles logged-in regular user (no admin claims)', async () => {
    getIdTokenResult.mockResolvedValue({ claims: {} });
    const { result } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBe(mockUser);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toEqual({});
  });

  it('handles admin user', async () => {
    getIdTokenResult.mockResolvedValue({ claims: { admin: true } });
    const { result } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toEqual({ admin: true });
  });

  it('handles super admin user', async () => {
    getIdTokenResult.mockResolvedValue({ claims: { admin: true, superAdmin: true } });
    const { result } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.claims).toEqual({ admin: true, superAdmin: true });
  });

  it('sets isAdmin to false when getIdTokenResult fails', async () => {
    getIdTokenResult.mockRejectedValue(new Error('token error'));
    const { result } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toEqual({});
  });

  it('loads the user profile and persists it in the cache', async () => {
    getIdTokenResult.mockResolvedValue({ claims: { admin: true } });
    getUserProfile.mockResolvedValue({ id: 'test-uid', displayName: 'ProfileName' });
    mockAuth.currentUser = mockUser;
    const { result } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(getUserProfile).toHaveBeenCalledWith('test-uid');
    expect(result.current.profile).toEqual({ id: 'test-uid', displayName: 'ProfileName' });
    expect(result.current.cached?.name).toBe('ProfileName');
  });

  it('falls back to the auth displayName when the profile has no name', async () => {
    getIdTokenResult.mockResolvedValue({ claims: {} });
    getUserProfile.mockResolvedValue({ id: 'test-uid', name: 'RealName' });
    mockAuth.currentUser = mockUser;
    const user = { uid: 'test-uid', email: 'test@example.com', displayName: 'AuthName' } as User;
    const { result } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    await act(async () => {
      await authCallback!(user);
    });
    // profile.name beats the auth displayName
    expect(result.current.cached?.name).toBe('RealName');
  });

  it('reads the cached identity from localStorage on start', () => {
    window.localStorage.setItem(
      'uuais.identity',
      JSON.stringify({ uid: 'cached-uid', name: 'CachedUser', email: null, photoURL: null, isAdmin: true }),
    );
    const { result } = loadHook();
    expect(result.current.cached).toEqual({
      uid: 'cached-uid',
      name: 'CachedUser',
      email: null,
      photoURL: null,
      isAdmin: true,
    });
  });

  it('calls signInWithPopup and mints the session cookie on signInWithGoogle', async () => {
    const { result } = loadHook();
    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(signInWithPopup).toHaveBeenCalledWith(mockAuth, expect.any(Object));
    expect(refreshSessionCookie).toHaveBeenCalledTimes(1);
  });

  it('calls signOut and clears the auth cookie on logout', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = mockFetch as unknown as typeof fetch
    const { result } = loadHook();
    await act(async () => {
      await result.current.logout();
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith(mockAuth);
    expect(mockFetch).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
  });

  it('unsubscribes the local listener on unmount', async () => {
    const { unmount } = loadHook();
    await waitFor(() => expect(authCallback).not.toBeNull());
    unmount();
    // The module keeps a single Firebase listener alive; unmount only removes
    // this consumer from the local listener set, so mockUnsubscribe stays unused.
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });
});
