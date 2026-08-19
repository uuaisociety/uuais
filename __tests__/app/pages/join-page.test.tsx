import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
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

async function triggerAuthCallback(user: Record<string, unknown> | null) {
  const firebase = jest.requireMock('@/lib/firebase-client') as {
    auth: { _callbackHolder: { current: ((u: unknown) => Promise<void> | void) | null } }
  }
  await waitFor(() => {
    expect(firebase.auth._callbackHolder.current).not.toBeNull()
  })
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
    it('renders already-a-member section', () => {
      render(<JoinPage />)
      expect(screen.getByText('Already a member?')).toBeInTheDocument()
    })

    it('renders sign-in buttons for registration', () => {
      render(<JoinPage />)
      expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Continue with GitHub/ })).toBeInTheDocument()
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

    it('hides sign-in card when logged in', async () => {
      render(<JoinPage />)
      await triggerAuthCallback(mockUser)
      expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument()
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

      await waitFor(() =>
        expect(mockedUsers().upsertUserProfile).toHaveBeenCalledWith('u1', expect.objectContaining({ isMember: true }))
      )
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

      await waitFor(() =>
        expect(mockedUsers().updateUserProfile).toHaveBeenCalledWith('u2', expect.any(Object))
      )
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

  describe('error handling', () => {
    it('resets saving state when upsertUserProfile fails (new member)', async () => {
      mockedUsers().getUserProfile.mockResolvedValue(null)
      mockedUsers().upsertUserProfile.mockRejectedValue(new Error('API error'))

      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })
      fireEvent.click(screen.getByLabelText(/I accept the/))
      fireEvent.click(screen.getByText('Save & Become Member'))

      // Saving state appears immediately
      expect(screen.getByText('Saving...')).toBeInTheDocument()

      // Wait for finally block to reset saving state
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })

      // Form remains visible — no navigation
      expect(screen.getByText('Save & Become Member')).toBeInTheDocument()
      expect(screen.getByLabelText(/I accept the/)).toBeInTheDocument()
      expect(mockedNav().useRouter().push).not.toHaveBeenCalled()
    })

    it('resets saving state when updateUserProfile fails (existing member)', async () => {
      mockedUsers().updateUserProfile.mockRejectedValue(new Error('API error'))
      mockedUsers().getUserProfile.mockResolvedValue({
        id: 'u2', displayName: 'Member', isMember: true, privacyAcceptedAt: '2024-01-01T00:00:00Z',
      })

      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u2', displayName: 'Member', email: 'm@uu.se' })
      fireEvent.click(screen.getByLabelText(/I accept the/))
      fireEvent.click(screen.getByText('Save & Become Member'))

      expect(screen.getByText('Saving...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Save & Become Member')).toBeInTheDocument()
      expect(mockedNav().useRouter().push).not.toHaveBeenCalled()
    })
  })

  describe('auth null callback', () => {
    it('hides profile form when auth callback fires with null', async () => {
      mockedUsers().getUserProfile.mockResolvedValue(null)
      render(<JoinPage />)

      // Initially logged out — no form
      expect(screen.queryByText('Complete your profile')).not.toBeInTheDocument()

      // Log in — form appears
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })
      expect(screen.getByText('Complete your profile')).toBeInTheDocument()

      // Auth callback fires with null (user signs out) — form disappears
      await triggerAuthCallback(null)
      expect(screen.queryByText('Complete your profile')).not.toBeInTheDocument()
    })
  })

  describe('form field interactions', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue(null)
    })

    it('changes student status select', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const select = screen.getByDisplayValue('Student')
      fireEvent.change(select, { target: { value: 'alumni' } })
      expect(screen.getByDisplayValue('Alumni')).toBeInTheDocument()

      fireEvent.change(select, { target: { value: 'other' } })
      // "Other" now matches both student status and gender selects
      const others = screen.getAllByDisplayValue('Other')
      expect(others.length).toBe(2)
    })

    it('changes gender select', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const select = screen.getByDisplayValue('Other')
      fireEvent.change(select, { target: { value: 'male' } })
      expect(screen.getByDisplayValue('Male')).toBeInTheDocument()

      fireEvent.change(select, { target: { value: 'female' } })
      expect(screen.getByDisplayValue('Female')).toBeInTheDocument()

      fireEvent.change(select, { target: { value: 'nonbinary' } })
      expect(screen.getByDisplayValue('Non-binary')).toBeInTheDocument()

      fireEvent.change(select, { target: { value: 'prefer_not' } })
      expect(screen.getByDisplayValue('Prefer not to say')).toBeInTheDocument()
    })

    it('changes program input', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const input = screen.getByPlaceholderText('e.g. Computer Science')
      fireEvent.change(input, { target: { value: 'Data Science' } })
      expect(screen.getByDisplayValue('Data Science')).toBeInTheDocument()
    })

    it('changes expected graduation year', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const input = screen.getByPlaceholderText('e.g. 2026')
      fireEvent.change(input, { target: { value: '2027' } })
      expect(screen.getByDisplayValue('2027')).toBeInTheDocument()
    })

    it('changes university select', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      // University and campus selects both default to "Uppsala"; pick the second one
      const universitySelect = screen.getAllByDisplayValue('Uppsala')[1]
      fireEvent.change(universitySelect, { target: { value: 'none' } })
      expect(screen.getByDisplayValue('None')).toBeInTheDocument()
    })

    it('changes bio textarea', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const textarea = screen.getByPlaceholderText('Write a short bio')
      fireEvent.change(textarea, { target: { value: 'AI enthusiast' } })
      expect(screen.getByDisplayValue('AI enthusiast')).toBeInTheDocument()
    })

    it('toggles newsletter checkbox', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const checkbox = screen.getByLabelText('Subscribe to newsletter')
      expect(checkbox).not.toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('toggles looking for job checkbox', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const checkbox = screen.getByLabelText('Looking for job opportunities')
      expect(checkbox).not.toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('marketing/analytics/partner opt-in checkboxes', () => {
    beforeEach(() => {
      mockedUsers().getUserProfile.mockResolvedValue(null)
    })

    it('toggles marketing opt-in checkbox', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const checkbox = screen.getByLabelText('Allow marketing communications')
      expect(checkbox).not.toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('toggles analytics opt-in checkbox', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const checkbox = screen.getByLabelText('Allow anonymous analytics')
      expect(checkbox).not.toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })

    it('toggles partner contact opt-in checkbox', async () => {
      render(<JoinPage />)
      await triggerAuthCallback({ uid: 'u1', displayName: 'Test', email: 't@uu.se' })

      const checkbox = screen.getByLabelText('Allow contact from partner companies')
      expect(checkbox).not.toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
      fireEvent.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('logged in - existing member pre-fills', () => {
    it('pre-fills fields from existing profile data (displayName, name, program, bio)', async () => {
      const mockProfile = {
        id: 'u4',
        displayName: 'ProfileName',
        name: 'John Doe',
        email: 'john@uu.se',
        isMember: true,
        privacyAcceptedAt: '2024-01-01T00:00:00Z',
        program: 'Computer Science',
        bio: 'AI researcher',
      }
      mockedUsers().getUserProfile.mockResolvedValue(mockProfile)

      render(<JoinPage />)
      // Auth displayName is "AuthName" but profile's displayName should take precedence
      await triggerAuthCallback({ uid: 'u4', displayName: 'AuthName', email: 'auth@uu.se' })

      // displayName from profile (not auth)
      expect(screen.getByDisplayValue('ProfileName')).toBeInTheDocument()
      // name from profile (spread from profile object)
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      // program from profile
      expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument()
      // bio from profile
      expect(screen.getByDisplayValue('AI researcher')).toBeInTheDocument()
    })
  })
})
