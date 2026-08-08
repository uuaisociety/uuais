import { renderHook, act } from '@testing-library/react';
import { useAdmin } from '@/hooks/useAdmin';
import { User } from 'firebase/auth';

jest.mock('@/hooks/useAdmin', () => jest.requireActual('@/hooks/useAdmin'));

const mockUnsubscribe = jest.fn();
let authCallback: ((user: User | null) => void) | null = null;

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  getIdTokenResult: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}));

jest.mock('@/lib/firebase-client', () => ({
  auth: {},
  refreshSessionCookie: jest.fn(),
}));

import { onAuthStateChanged, getIdTokenResult, signInWithPopup, signOut } from 'firebase/auth';
import { refreshSessionCookie } from '@/lib/firebase-client';

const mockUser = { uid: 'test-uid', email: 'test@example.com' } as User;

describe('useAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authCallback = null;
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, cb) => {
      authCallback = cb;
      return mockUnsubscribe;
    });
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useAdmin());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toBeNull();
  });

  it('handles null user (not logged in)', async () => {
    const { result } = renderHook(() => useAdmin());
    await act(async () => {
      await authCallback!(null);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toBeNull();
  });

  it('handles logged-in regular user (no admin claims)', async () => {
    (getIdTokenResult as jest.Mock).mockResolvedValue({ claims: {} });
    const { result } = renderHook(() => useAdmin());
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
    (getIdTokenResult as jest.Mock).mockResolvedValue({ claims: { admin: true } });
    const { result } = renderHook(() => useAdmin());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toEqual({ admin: true });
  });

  it('handles super admin user', async () => {
    (getIdTokenResult as jest.Mock).mockResolvedValue({ claims: { admin: true, superAdmin: true } });
    const { result } = renderHook(() => useAdmin());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.claims).toEqual({ admin: true, superAdmin: true });
  });

  it('sets isAdmin to false when getIdTokenResult fails', async () => {
    (getIdTokenResult as jest.Mock).mockRejectedValue(new Error('token error'));
    const { result } = renderHook(() => useAdmin());
    await act(async () => {
      await authCallback!(mockUser);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.claims).toBeNull();
  });

  it('calls signInWithPopup and mints the session cookie on signInWithGoogle', async () => {
    const { result } = renderHook(() => useAdmin());
    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(signInWithPopup).toHaveBeenCalledWith({}, expect.any(Object));
    expect(refreshSessionCookie).toHaveBeenCalledTimes(1);
  });

  it('calls signOut and clears the auth cookie on logout', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = mockFetch as unknown as typeof fetch
    const { result } = renderHook(() => useAdmin());
    await act(async () => {
      await result.current.logout();
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({});
    expect(mockFetch).toHaveBeenCalledWith('/api/logout', { method: 'POST' });
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useAdmin());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
