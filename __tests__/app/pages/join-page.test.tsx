import { render, screen, fireEvent, act } from '@testing-library/react'
import JoinPage from '@/components/pages/JoinPage'

jest.mock('@/lib/firebase-client', () => {
  const callbackHolder: { current: ((user: unknown) => void) | null } = { current: null }
  return {
    auth: {
      onAuthStateChanged: jest.fn((cb: (user: unknown) => void) => {
        callbackHolder.current = cb
        return jest.fn()
      }),
      _callbackHolder: callbackHolder,
    },
    signInWithGooglePopup: jest.fn(),
    signInWithGithubPopup: jest.fn(),
  }
})

jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn(),
  upsertUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
}))

jest.mock('@/components/ui/Notifications', () => ({
  NotificationsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNotify: () => ({ notify: jest.fn() }),
}))

jest.mock('next/navigation', () => {
  const push = jest.fn()
  return { useRouter: () => ({ push }) }
})

jest.mock('@/utils/seo', () => ({
  updatePageMeta: jest.fn(),
}))

jest.mock('@hugeicons/react', () => ({
  HugeiconsIcon: ({ icon }: { icon: string }) => <span data-testid="hugeicon">{String(icon)}</span>,
}))

jest.mock('@hugeicons/core-free-icons', () => ({
  GoogleIcon: 'google-icon',
  GithubIcon: 'github-icon',
}))

async function triggerAuthCallback(user: Record<string, unknown> | null) {
  const firebase = jest.requireMock('@/lib/firebase-client') as {
    auth: { _callbackHolder: { current: ((u: unknown) => Promise<void> | void) | null } }
  }
  const cb = firebase.auth._callbackHolder.current
  if (cb) await act(async () => { await cb(user) })
}

function mockedUsers() {
  return jest.requireMock('@/lib/firestore/users') as {
    getUserProfile: jest.Mock
    upsertUserProfile: jest.Mock
    updateUserProfile: jest.Mock
  }
}

function mockedFirebase() {
  return jest.requireMock('@/lib/firebase-client') as {
    auth: { _callbackHolder: { current: ((u: unknown) => Promise<void> | void) | null } }
    signInWithGooglePopup: jest.Mock
    signInWithGithubPopup: jest.Mock
  }
}

function mockedNav() {
  return jest.requireMock('next/navigation') as { useRouter: () => { push: jest.Mock } }
}

function mockedSeo() {
  return jest.requireMock('@/utils/seo') as { updatePageMeta: jest.Mock }
}

describe('JoinPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page heading', () => {
    render(<JoinPage />)
    expect(screen.getByText('Join UU AI Society')).toBeInTheDocument()
    expect(screen.getByText(/Create an account/)).toBeInTheDocument()
  })

  it('calls updatePageMeta on mount', () => {
    render(<JoinPage />)
    expect(mockedSeo().updatePageMeta).toHaveBeenCalledWith('Join Us', expect.any(String))
  })

  describe('logged out', () => {
    it('renders sign-in buttons', () => {
      render(<JoinPage />)
      expect(screen.getByText(/Sign in or Create Account/)).toBeInTheDocument()
      expect(screen.getByText(/Continue with Google/)).toBeInTheDocument()
      expect(screen.getByText(/Continue with GitHub/)).toBeInTheDocument()
    })

    it('calls signInWithGooglePopup on Google button click', () => {
      render(<JoinPage />)
      fireEvent.click(screen.getByText(/Continue with Google/))
      expect(mockedFirebase().signInWithGooglePopup).toHaveBeenCalled()
    })

    it('calls signInWithGithubPopup on GitHub button click', () => {
      render(<JoinPage />)
      fireEvent.click(screen.getByText(/Continue with GitHub/))
      expect(mockedFirebase().signInWithGithubPopup).toHaveBeenCalled()
    })

    it('renders already-a-member section', () => {
      render(<JoinPage />)
      expect(screen.getByText('Already a member?')).toBeInTheDocument()
    })

    it('does not show profile form when logged out', () => {
      render(<JoinPage />)
      expect(screen.queryByText('Complete your profile')).not.toBeInTheDocument()
    })
  })

  describe('logged in - new member', () => {
    const mockUser = { uid: 'u1', displayName: 'TestUser', email: 'test@uu.se' }

    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue(null)
    })

    it('shows profile completion form after auth', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      expect(screen.getByText('Complete your profile')).toBeInTheDocument()
    })

    it('shows yellow banner for incomplete profile', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      expect(screen.getByText(/please complete your profile/)).toBeInTheDocument()
    })

    it('pre-fills displayName from auth', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument()
    })

    it('calls getUserProfile with uid', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      expect(mockedUsers().getUserProfile).toHaveBeenCalledWith('u1')
    })

    it('disables save button when privacy not accepted', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      expect(screen.getByText('Save & Become Member')).toBeDisabled()
    })

    it('enables save button when privacy is accepted', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      fireEvent.click(screen.getByLabelText(/I accept the/))
      expect(screen.getByText('Save & Become Member')).not.toBeDisabled()
    })

    it('calls upsertUserProfile on save for new profile', async () => {
      mockedUsers().upsertUserProfile.mockResolvedValue(undefined)
      mockedUsers().getUserProfile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'u1', displayName: 'TestUser', isMember: true })

      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      fireEvent.click(screen.getByLabelText(/I accept the/))
      fireEvent.click(screen.getByText('Save & Become Member'))

      expect(mockedUsers().upsertUserProfile).toHaveBeenCalledWith('u1', expect.objectContaining({ isMember: true }))
    })

    it('shows saving state while submitting', async () => {
      mockedUsers().upsertUserProfile.mockImplementation(() => new Promise(() => {}))

      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      fireEvent.click(screen.getByLabelText(/I accept the/))
      fireEvent.click(screen.getByText('Save & Become Member'))

      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('navigates to /account after save', async () => {
      mockedUsers().upsertUserProfile.mockResolvedValue(undefined)
      mockedUsers().getUserProfile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'u1', displayName: 'TestUser', isMember: true })

      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      fireEvent.click(screen.getByLabelText(/I accept the/))
      fireEvent.click(screen.getByText('Save & Become Member'))

      await screen.findByText('Save & Become Member')
      expect(mockedNav().useRouter().push).toHaveBeenCalledWith('/account')
    })

    it('can update displayName field', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      const input = screen.getByDisplayValue('TestUser')
      fireEvent.change(input, { target: { value: 'NewName' } })
      expect(screen.getByDisplayValue('NewName')).toBeInTheDocument()
    })
  })

  describe('logged in - existing member', () => {
    const mockUser = { uid: 'u2', displayName: 'Member', email: 'member@uu.se' }

    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'u2', displayName: 'Member', isMember: true, privacyAcceptedAt: '2024-01-01T00:00:00Z',
      })
    })

    it('shows blue already-member banner', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      expect(screen.getByText(/You are already a member/)).toBeInTheDocument()
    })

    it('calls updateUserProfile on save for existing profile', async () => {
      mockedUsers().getUserProfile
        .mockResolvedValueOnce({ id: 'u2', displayName: 'Member', isMember: true, privacyAcceptedAt: '2024-01-01T00:00:00Z' })
        .mockResolvedValueOnce({ id: 'u2', displayName: 'Member', isMember: true })

      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      fireEvent.click(screen.getByLabelText(/I accept the/))
      fireEvent.click(screen.getByText('Save & Become Member'))

      expect(mockedUsers().updateUserProfile).toHaveBeenCalledWith('u2', expect.any(Object))
    })
  })

  describe('heard of us - other', () => {
    const mockUser = { uid: 'u3', displayName: 'User', email: 'u@uu.se' }

    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue(null)
    })

    it('shows text input when "Other" is selected', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)

      const select = screen.getByDisplayValue('Select an option')
      fireEvent.change(select, { target: { value: 'other' } })

      expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument()
    })
  })
})
