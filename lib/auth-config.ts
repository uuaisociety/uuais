export const authConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  cookieName: 'AuthToken',
  cookieSignatureKeys: [
    process.env.AUTH_COOKIE_SIGNATURE_KEY_CURRENT ?? (() => { if (process.env.NODE_ENV === 'production') throw new Error('Missing AUTH_COOKIE_SIGNATURE_KEY_CURRENT'); return 'dev-key-not-secure-123456789012345678901234567890'; })(),
    process.env.AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS ?? (() => { if (process.env.NODE_ENV === 'production') throw new Error('Missing AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS'); return 'dev-key-not-secure-123456789012345678901234567890'; })(),
  ],
  cookieSerializeOptions: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  },
  serviceAccount: {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
};
