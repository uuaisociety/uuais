const mockInitializeApp = jest.fn(() => 'mock-app')
const mockGetApp = jest.fn(() => 'mock-app')
const mockGetApps = jest.fn()
const mockGetFirestore = jest.fn(() => 'mock-db')
const mockGetAuth = jest.fn(() => 'mock-auth')
const mockSignInWithPopup = jest.fn()
const mockLinkWithPopup = jest.fn()
const mockSignOut = jest.fn()

jest.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApp: mockGetApp,
  getApps: mockGetApps,
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: mockGetFirestore,
}))

jest.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  GoogleAuthProvider: jest.fn(() => ({ providerId: 'google.com' })),
  GithubAuthProvider: jest.fn(() => ({ providerId: 'github.com' })),
  OAuthProvider: jest.fn(() => ({ providerId: 'microsoft.com' })),
  signInWithPopup: mockSignInWithPopup,
  linkWithPopup: mockLinkWithPopup,
  signOut: mockSignOut,
}))

describe('firebase-client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe('firebase app initialization', () => {
    it('initializes new app when no apps exist', async () => {
      mockGetApps.mockReturnValue([])
      const mod = await import('@/lib/firebase-client')
      expect(mockGetApps).toHaveBeenCalled()
      expect(mockInitializeApp).toHaveBeenCalled()
      expect(mockGetApp).not.toHaveBeenCalled()
      expect(mod.db).toBe('mock-db')
      expect(mod.auth).toBe('mock-auth')
    })

    it('reuses existing app when already initialized', async () => {
      mockGetApps.mockReturnValue(['existing-app'])
      const mod = await import('@/lib/firebase-client')
      expect(mockGetApps).toHaveBeenCalled()
      expect(mockGetApp).toHaveBeenCalled()
      expect(mockInitializeApp).not.toHaveBeenCalled()
      expect(mod.db).toBe('mock-db')
      expect(mod.auth).toBe('mock-auth')
    })
  })

  describe('providers', () => {
    beforeEach(() => {
      mockGetApps.mockReturnValue([])
    })

    it('creates GoogleAuthProvider', async () => {
      const { googleProvider } = await import('@/lib/firebase-client')
      expect(googleProvider).toEqual({ providerId: 'google.com' })
    })

    it('creates GithubAuthProvider', async () => {
      const { githubProvider } = await import('@/lib/firebase-client')
      expect(githubProvider).toEqual({ providerId: 'github.com' })
    })

    it('creates Microsoft OAuthProvider', async () => {
      const { microsoftProvider } = await import('@/lib/firebase-client')
      expect(microsoftProvider).toEqual({ providerId: 'microsoft.com' })
    })
  })

  describe('sign-in helpers', () => {
    beforeEach(() => {
      mockGetApps.mockReturnValue([])
    })

    it('signInWithGooglePopup calls signInWithPopup with google provider', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: 'google-user' })
      const { signInWithGooglePopup } = await import('@/lib/firebase-client')
      const result = await signInWithGooglePopup()
      expect(mockSignInWithPopup).toHaveBeenCalledWith('mock-auth', { providerId: 'google.com' })
      expect(result).toBe('google-user')
    })

    it('signInWithGithubPopup calls signInWithPopup with github provider', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: 'github-user' })
      const { signInWithGithubPopup } = await import('@/lib/firebase-client')
      const result = await signInWithGithubPopup()
      expect(mockSignInWithPopup).toHaveBeenCalledWith('mock-auth', { providerId: 'github.com' })
      expect(result).toBe('github-user')
    })

    it('signInWithMicrosoftPopup calls signInWithPopup with microsoft provider', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: 'microsoft-user' })
      const { signInWithMicrosoftPopup } = await import('@/lib/firebase-client')
      const result = await signInWithMicrosoftPopup()
      expect(mockSignInWithPopup).toHaveBeenCalledWith('mock-auth', { providerId: 'microsoft.com' })
      expect(result).toBe('microsoft-user')
    })
  })

  describe('account linking helpers', () => {
    const mockUser = { uid: 'u1' }

    beforeEach(() => {
      mockGetApps.mockReturnValue([])
    })

    it('linkGoogleToCurrentUser calls linkWithPopup', async () => {
      mockLinkWithPopup.mockResolvedValue({ user: 'linked-google' })
      const { linkGoogleToCurrentUser } = await import('@/lib/firebase-client')
      const result = await linkGoogleToCurrentUser(mockUser)
      expect(mockLinkWithPopup).toHaveBeenCalledWith(mockUser, { providerId: 'google.com' })
      expect(result).toBe('linked-google')
    })

    it('linkGithubToCurrentUser calls linkWithPopup', async () => {
      mockLinkWithPopup.mockResolvedValue({ user: 'linked-github' })
      const { linkGithubToCurrentUser } = await import('@/lib/firebase-client')
      const result = await linkGithubToCurrentUser(mockUser)
      expect(mockLinkWithPopup).toHaveBeenCalledWith(mockUser, { providerId: 'github.com' })
      expect(result).toBe('linked-github')
    })

    it('linkMicrosoftToCurrentUser calls linkWithPopup', async () => {
      mockLinkWithPopup.mockResolvedValue({ user: 'linked-microsoft' })
      const { linkMicrosoftToCurrentUser } = await import('@/lib/firebase-client')
      const result = await linkMicrosoftToCurrentUser(mockUser)
      expect(mockLinkWithPopup).toHaveBeenCalledWith(mockUser, { providerId: 'microsoft.com' })
      expect(result).toBe('linked-microsoft')
    })
  })

  describe('firebaseSignOut', () => {
    beforeEach(() => {
      mockGetApps.mockReturnValue([])
    })

    it('calls signOut with auth', async () => {
      const { firebaseSignOut } = await import('@/lib/firebase-client')
      await firebaseSignOut()
      expect(mockSignOut).toHaveBeenCalledWith('mock-auth')
    })
  })
})
