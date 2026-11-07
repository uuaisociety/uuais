jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => [{}]),
  getApp: jest.fn(() => ({})),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
}));

jest.mock('firebase/auth', () => {
  const order: string[] = [];
  const auth = {
    currentUser: {
      getIdToken: jest.fn(async () => {
        order.push('token');
        return 'id-token';
      }),
    },
    authStateReady: jest.fn(async () => {
      order.push('ready');
    }),
  };
  const signInWithPopup = jest.fn(async () => {
    order.push('popup');
    return { user: { uid: 'u1' } };
  });
  return {
    __mock: { order, auth, signInWithPopup },
    getAuth: jest.fn(() => auth),
    connectAuthEmulator: jest.fn(),
    GoogleAuthProvider: jest.fn(),
    GithubAuthProvider: jest.fn(),
    OAuthProvider: jest.fn(),
    signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
    linkWithPopup: jest.fn(),
    signOut: jest.fn(),
    sendSignInLinkToEmail: jest.fn(async () => {}),
  };
});

import {
  emailLinkCooldownSeconds,
  sendEmailSignInLink,
  signInWithGooglePopup,
} from '@/lib/firebase-client';

type AuthMocks = {
  order: string[];
  auth: {
    currentUser: { getIdToken: jest.Mock };
    authStateReady: jest.Mock;
  };
  signInWithPopup: jest.Mock;
};

const { order, auth: mockAuth } = (
  jest.requireMock('firebase/auth') as { __mock: AuthMocks }
).__mock;

describe('signInWithGooglePopup', () => {
  beforeEach(() => {
    order.length = 0;
    jest.clearAllMocks();
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  it('waits for auth initialization before opening the popup', async () => {
    await signInWithGooglePopup();

    expect(order).toEqual(['ready', 'popup', 'token']);
    expect(mockAuth.authStateReady).toHaveBeenCalledTimes(1);
  });

  it('mints the session cookie with the cached token instead of forcing a refresh', async () => {
    await signInWithGooglePopup();

    expect(mockAuth.currentUser.getIdToken).toHaveBeenCalledWith();
    expect(global.fetch).toHaveBeenCalledWith('/api/login', {
      headers: { Authorization: 'Bearer id-token' },
      credentials: 'include',
    });
  });
});

describe('email sign-in link cooldown', () => {
  const now = 1_800_000_000_000;
  let nowSpy: jest.SpyInstance;

  beforeEach(() => {
    window.localStorage.clear();
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => nowSpy.mockRestore());

  it('lets a browser that sent nothing request a link', () => {
    expect(emailLinkCooldownSeconds()).toBe(0);
  });

  it('holds the next request for a minute after a link is sent', async () => {
    await sendEmailSignInLink('a@example.com', 'https://uuais.com/login');
    expect(emailLinkCooldownSeconds()).toBe(60);

    nowSpy.mockReturnValue(now + 59_500);
    expect(emailLinkCooldownSeconds()).toBe(1);

    nowSpy.mockReturnValue(now + 60_000);
    expect(emailLinkCooldownSeconds()).toBe(0);
  });

  it('starts no cooldown when Firebase refuses to send', async () => {
    const { sendSignInLinkToEmail } = jest.requireMock('firebase/auth') as {
      sendSignInLinkToEmail: jest.Mock;
    };
    sendSignInLinkToEmail.mockRejectedValueOnce(
      Object.assign(new Error('quota'), { code: 'auth/quota-exceeded' }),
    );
    await expect(
      sendEmailSignInLink('a@example.com', 'https://uuais.com/login'),
    ).rejects.toThrow('quota');
    expect(emailLinkCooldownSeconds()).toBe(0);
  });

  it('does not lock the form when the stored time is in the future', () => {
    window.localStorage.setItem(
      'emailForSignInSentAt',
      String(now + 3_600_000),
    );
    expect(emailLinkCooldownSeconds()).toBe(0);
  });
});
