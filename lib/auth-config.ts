export const authConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  cookieName: 'AuthToken',
  cookieSignatureKeys: [
    process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT ??
      (() => {
        if (process.env.NODE_ENV === 'production')
          throw new Error('Missing AUTH_COOKIE_SIGNATURE_KEY_CURRENT');
        return 'dev-key-not-secure-123456789012345678901234567890';
      })(),
    process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS ??
      (() => {
        if (process.env.NODE_ENV === 'production')
          throw new Error('Missing AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS');
        return 'dev-key-not-secure-123456789012345678901234567890';
      })(),
  ],
  cookieSerializeOptions: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    // 1 week, in seconds (the library takes seconds, not ms). Access still ends
    // within an hour of revocation: the ID token inside is refreshed and
    // verified by the proxy, and server-auth rejects one it couldn't refresh.
    maxAge: 7 * 24 * 60 * 60,
  },
  serviceAccount: {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
};
