import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AccountPage from '@/app/account/page'
import { updatePageMeta } from '@/utils/seo'

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn(),
    currentUser: null,
  },
  linkGoogleToCurrentUser: jest.fn(() => Promise.resolve()),
  linkGithubToCurrentUser: jest.fn(() => Promise.resolve()),
  linkMicrosoftToCurrentUser: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/lib/firestore', () => ({
  getUserProfile: jest.fn(),
  upsertUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  getMyRegistrations: jest.fn(),
  getAllEvents: jest.fn(),
}))

jest.mock('@/lib/firestore/registrations', () => ({
  cancelRegistration: jest.fn(),
  confirmRegistration: jest.fn(),
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: jest.fn(() => ({ notify: jest.fn() })),
}))

jest.mock('vanilla-cookieconsent', () => ({
  showPreferences: jest.fn(),
}))

jest.mock('@/components/ui/LoginModal', () => ({
  __esModule: true,
  default: () => <div data-testid="login-modal">Login Modal</div>,
}))

jest.mock('@/components/ui/ConfirmModal', () => ({
  __esModule: true,
  default: ({ open, title, description, onConfirm, onClose }: { open: boolean; title?: string; description?: string; onConfirm: () => void; onClose: () => void }) =>
    open ? (
      <div data-testid="confirm-modal" data-title={title}>
        <p>{description}</p>
        <button data-testid="modal-confirm" onClick={onConfirm}>Confirm</button>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

jest.mock('@/components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import * as firebaseClient from '@/lib/firebase-client'
import { getUserProfile, getMyRegistrations, getAllEvents, upsertUserProfile, updateUserProfile } from '@/lib/firestore'
import { cancelRegistration, confirmRegistration } from '@/lib/firestore/registrations'
import * as CookieConsent from 'vanilla-cookieconsent'

const auth = firebaseClient.auth as unknown as { onAuthStateChanged: jest.Mock; currentUser: unknown }

const mockUser = {
  uid: 'user-123',
  providerData: [{ providerId: 'google.com' }],
  reload: jest.fn(),
}

const fullProfile: Record<string, unknown> = {
  displayName: 'Alex',
  name: 'Alex Doe',
  studentStatus: 'student',
  campus: 'Uppsala',
  linkedin: 'https://linkedin.com/in/alex',
  github: 'https://github.com/alex',
  website: 'https://alex.dev',
  university: 'Uppsala',
  program: 'Computer Science',
  expectedGraduationYear: 2026,
  gender: 'male',
  heardOfUs: 'friends',
  bio: 'AI enthusiast',
  newsletter: true,
  lookingForJob: false,
  privacyAcceptedAt: '2025-01-01T00:00:00Z',
  marketingOptIn: true,
  analyticsOptIn: false,
  partnerContactOptIn: true,
}

const futureEvent = {
  id: 'evt-future',
  title: 'AI Workshop',
  published: true,
  eventStartAt: new Date(Date.now() + 86400000 * 30).toISOString(),
}

const pastEvent = {
  id: 'evt-past',
  title: 'Past Event',
  published: true,
  eventStartAt: '2024-01-01T00:00:00Z',
}

const allEvents = [futureEvent, pastEvent]

const baseReg = {
  userId: 'user-123',
  registeredAt: '2025-05-01T12:00:00Z',
  registrationData: {},
}

describe('AccountPage', () => {
  describe('loading state', () => {
    it('shows loading indicator when auth state not yet resolved', () => {
      auth.onAuthStateChanged.mockImplementation(() => jest.fn())
      auth.currentUser = null
      render(<AccountPage />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('logged out', () => {
    it('renders LoginModal when user is null', () => {
      auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
        cb(null)
        return jest.fn()
      })
      auth.currentUser = null
      render(<AccountPage />)
      expect(screen.getByTestId('login-modal')).toBeInTheDocument()
    })
  })

  describe('logged in', () => {
    const defaults = () => {
      auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
        cb(mockUser)
        return jest.fn()
      })
      ;(getUserProfile as jest.Mock).mockResolvedValue(fullProfile)
      ;(getMyRegistrations as jest.Mock).mockResolvedValue([])
      ;(getAllEvents as jest.Mock).mockResolvedValue(allEvents)
      auth.currentUser = mockUser
    }

    it('renders account page heading', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('My Account')).toBeInTheDocument()
    })

    it('renders Profile card with view mode by default', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('View your membership details.')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    it('renders Personal Information section with user data', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Personal Information')).toBeInTheDocument()
      expect(screen.getByText('Display name')).toBeInTheDocument()
      expect(screen.getByText('Alex')).toBeInTheDocument()
      expect(screen.getByText('Alex Doe')).toBeInTheDocument()
    })

    it('shows Not set placeholder for empty optional fields', async () => {
      defaults()
      ;(getUserProfile as jest.Mock).mockResolvedValue({})
      render(<AccountPage />)
      const italics = await screen.findAllByText('Not set')
      expect(italics.length).toBeGreaterThanOrEqual(1)
    })

    it('renders Contact & Social section', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Contact & Social')).toBeInTheDocument()
      expect(await screen.findByText('student')).toBeInTheDocument()
      expect(screen.getAllByText('Uppsala').length).toBeGreaterThanOrEqual(1)
    })

    it('renders LinkedIn, GitHub, Website as links when set', async () => {
      defaults()
      render(<AccountPage />)
      const linkedinEl = await screen.findByText('https://linkedin.com/in/alex')
      expect(linkedinEl.closest('a')).toHaveAttribute('href', 'https://linkedin.com/in/alex')
      expect(screen.getByText('https://github.com/alex').closest('a')).toHaveAttribute('href', 'https://github.com/alex')
      expect(screen.getByText('https://alex.dev').closest('a')).toHaveAttribute('href', 'https://alex.dev')
    })

    it('renders Academic Information section', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Academic Information')).toBeInTheDocument()
      expect(screen.getByText('Computer Science')).toBeInTheDocument()
      expect(screen.getByText('2026')).toBeInTheDocument()
    })

    it('renders gender with proper formatting', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('male')).toBeInTheDocument()
    })

    it('renders gender prefer_not formatting', async () => {
      defaults()
      ;(getUserProfile as jest.Mock).mockResolvedValue({ ...fullProfile, gender: 'prefer_not' })
      render(<AccountPage />)
      expect(await screen.findByText('Prefer not to say')).toBeInTheDocument()
    })

    it('renders non-binary gender formatting', async () => {
      defaults()
      ;(getUserProfile as jest.Mock).mockResolvedValue({ ...fullProfile, gender: 'nonbinary' })
      render(<AccountPage />)
      expect(await screen.findByText('Non-binary')).toBeInTheDocument()
    })

    it('renders how did you hear and bio', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('How did you hear of us?')).toBeInTheDocument()
      expect(screen.getByText('friends')).toBeInTheDocument()
      expect(screen.getByText('Bio')).toBeInTheDocument()
      expect(screen.getByText('AI enthusiast')).toBeInTheDocument()
    })

    it('renders newsletter and looking for job status', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Newsletter: Subscribed')).toBeInTheDocument()
      expect(screen.getByText('Looking for job: No')).toBeInTheDocument()
    })

    it('renders privacy, marketing, analytics, partner contact fields', async () => {
      defaults()
      render(<AccountPage />)
      await screen.findByText('Marketing: Opted in')
      expect(screen.getByText(/privacy: accepted at/i)).toBeInTheDocument()
      expect(screen.getByText('Analytics: Opted out')).toBeInTheDocument()
      expect(screen.getByText('Partner contact: Opted in')).toBeInTheDocument()
    })

    it('renders Linked Accounts card', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Linked Accounts')).toBeInTheDocument()
      expect(screen.getByText('Google')).toBeInTheDocument()
      expect(screen.getByText('GitHub')).toBeInTheDocument()
    })

    it('shows Linked for already-linked providers', async () => {
      defaults()
      render(<AccountPage />)
      const linkedTexts = await screen.findAllByText('Linked')
      expect(linkedTexts.length).toBe(1)
    })

    it('shows Link button for unlinked providers', async () => {
      defaults()
      const mockUserNoGithub = {
        ...mockUser,
        providerData: [{ providerId: 'google.com' }],
      }
      auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
        cb(mockUserNoGithub)
        return jest.fn()
      })
      auth.currentUser = mockUserNoGithub
      render(<AccountPage />)
      const linkButtons = await screen.findAllByText('Link')
      expect(linkButtons.length).toBe(1)
    })

    it('renders Cookie Settings card', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Cookie Settings')).toBeInTheDocument()
      expect(screen.getByText('Change cookie settings')).toBeInTheDocument()
    })

    it('opens cookie preferences on button click', async () => {
      defaults()
      render(<AccountPage />)
      expect(await screen.findByText('Change cookie settings')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Change cookie settings'))
      expect(CookieConsent.showPreferences).toHaveBeenCalled()
    })

    it('does not render registrations section when there are no registrations', async () => {
      defaults()
      render(<AccountPage />)
      await screen.findByText('My Account')
      expect(screen.queryByText('My Event Applications')).not.toBeInTheDocument()
    })

    it('calls updatePageMeta on mount', async () => {
      defaults()
      render(<AccountPage />)
      await screen.findByText('My Account')
      expect(updatePageMeta).toHaveBeenCalledWith(
        'My Account',
        'Manage your UU AI Society account and event registrations'
      )
    })

    it('shows registrations section and filters correctly', async () => {
      defaults()
      const regs = [
        { id: 'reg-1', eventId: 'evt-future', status: 'registered', ...baseReg },
        { id: 'reg-2', eventId: 'evt-past', status: 'registered', ...baseReg, registeredAt: '2024-01-01T12:00:00Z' },
      ]
      ;(getMyRegistrations as jest.Mock).mockResolvedValue(regs)
      render(<AccountPage />)
      expect(await screen.findByText('My Event Applications')).toBeInTheDocument()
      expect(screen.getByText('AI Workshop')).toBeInTheDocument()
      expect(screen.queryByText('Past Event')).not.toBeInTheDocument()
    })

    it('shows registered status for registrations', async () => {
      defaults()
      ;(getMyRegistrations as jest.Mock).mockResolvedValue([{ id: 'reg-1', eventId: 'evt-future', status: 'registered', ...baseReg }])
      render(<AccountPage />)
      expect(await screen.findByText(/• registered/)).toBeInTheDocument()
    })

    it('shows Cancel button for registered registrations', async () => {
      defaults()
      ;(getMyRegistrations as jest.Mock).mockResolvedValue([{ id: 'reg-1', eventId: 'evt-future', status: 'registered', ...baseReg }])
      render(<AccountPage />)
      expect(await screen.findByText('Cancel')).toBeInTheDocument()
    })

    it('shows Confirm spot button for invited registrations', async () => {
      defaults()
      ;(getMyRegistrations as jest.Mock).mockResolvedValue([{ id: 'reg-inv', eventId: 'evt-future', status: 'invited', confirmationToken: 'tok-123', ...baseReg }])
      render(<AccountPage />)
      expect(await screen.findByText('Confirm spot')).toBeInTheDocument()
    })

    it('calls confirmRegistration on Confirm spot click', async () => {
      defaults()
      ;(confirmRegistration as jest.Mock).mockResolvedValue({ ok: true, message: 'Confirmed' })
      ;(getMyRegistrations as jest.Mock)
        .mockResolvedValueOnce([{ id: 'reg-inv', eventId: 'evt-future', status: 'invited', confirmationToken: 'tok-123', ...baseReg }])
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Confirm spot'))
      await waitFor(() => {
        expect(confirmRegistration).toHaveBeenCalledWith('reg-inv', 'tok-123')
      })
    })

    it('opens cancel registration modal when Cancel is clicked', async () => {
      defaults()
      ;(getMyRegistrations as jest.Mock)
        .mockResolvedValueOnce([{ id: 'reg-1', eventId: 'evt-future', status: 'registered', ...baseReg }])
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Cancel'))
      expect(screen.getByTestId('confirm-modal')).toHaveAttribute('data-title', 'Unregister from event')
    })

    it('cancels registration on modal confirm', async () => {
      defaults()
      ;(cancelRegistration as jest.Mock).mockResolvedValue(undefined)
      ;(getMyRegistrations as jest.Mock)
        .mockResolvedValueOnce([{ id: 'reg-1', eventId: 'evt-future', status: 'registered', ...baseReg }])
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Cancel'))
      fireEvent.click(screen.getByTestId('modal-confirm'))
      await waitFor(() => {
        expect(cancelRegistration).toHaveBeenCalledWith('reg-1')
      })
    })
  })

  describe('edit mode', () => {
    const defaults = () => {
      auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
        cb(mockUser)
        return jest.fn()
      })
      ;(getUserProfile as jest.Mock).mockResolvedValue(fullProfile)
      ;(getMyRegistrations as jest.Mock).mockResolvedValue([])
      ;(getAllEvents as jest.Mock).mockResolvedValue(allEvents)
      auth.currentUser = mockUser
    }

    it('switches to edit mode when Edit button is clicked', async () => {
      defaults()
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Edit'))
      expect(screen.getByText('Update your membership details.')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders form fields in edit mode', async () => {
      defaults()
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Edit'))
      expect(screen.getByDisplayValue('Alex')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Alex Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('https://linkedin.com/in/alex')).toBeInTheDocument()
      expect(screen.getByDisplayValue('https://github.com/alex')).toBeInTheDocument()
      expect(screen.getByDisplayValue('https://alex.dev')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument()
      expect(screen.getByDisplayValue('AI enthusiast')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2026')).toBeInTheDocument()
    })

    it('calls updateUserProfile on Save for existing profile', async () => {
      defaults()
      ;(updateUserProfile as jest.Mock).mockResolvedValue(undefined)
      ;(getUserProfile as jest.Mock).mockResolvedValue(fullProfile)
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Edit'))
      fireEvent.click(screen.getByText('Save'))
      await waitFor(() => {
        expect(updateUserProfile).toHaveBeenCalledWith('user-123', expect.objectContaining({ displayName: 'Alex' }))
      })
    })

    it('calls upsertUserProfile on Save when no existing profile', async () => {
      defaults()
      ;(upsertUserProfile as jest.Mock).mockResolvedValue(undefined)
      ;(getUserProfile as jest.Mock).mockReset()
      ;(getUserProfile as jest.Mock)
        .mockResolvedValueOnce(fullProfile)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ displayName: 'Alex' })
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Edit'))
      fireEvent.click(screen.getByText('Save'))
      await waitFor(() => {
        expect(upsertUserProfile).toHaveBeenCalledWith('user-123', expect.objectContaining({ displayName: 'Alex' }))
      })
    })

    it('shows discard changes modal on Cancel click in edit mode', async () => {
      defaults()
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Edit'))
      fireEvent.click(screen.getByText('Cancel'))
      expect(screen.getByTestId('confirm-modal')).toHaveAttribute('data-title', 'Discard changes')
      expect(screen.getByText('Are you sure you want to discard all unsaved changes?')).toBeInTheDocument()
    })

    it('discards changes and returns to view mode on confirm discard', async () => {
      defaults()
      ;(getUserProfile as jest.Mock).mockResolvedValue(fullProfile)
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Edit'))
      fireEvent.click(screen.getByText('Cancel'))
      fireEvent.click(screen.getByTestId('modal-confirm'))
      await waitFor(() => {
        expect(screen.getByText('View your membership details.')).toBeInTheDocument()
      })
    })

    it('closes discard modal and stays in edit mode on Cancel dismiss', async () => {
      defaults()
      render(<AccountPage />)
      fireEvent.click(await screen.findByText('Edit'))
      fireEvent.click(screen.getByText('Cancel'))
      fireEvent.click(screen.getByTestId('modal-close'))
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  describe('account linking', () => {
    const defaults = () => {
      const userWithNoProviders = {
        ...mockUser,
        providerData: [],
        reload: jest.fn(),
      }
      auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
        cb(userWithNoProviders)
        return jest.fn()
      })
      ;(getUserProfile as jest.Mock).mockResolvedValue(fullProfile)
      ;(getMyRegistrations as jest.Mock).mockResolvedValue([])
      ;(getAllEvents as jest.Mock).mockResolvedValue(allEvents)
      auth.currentUser = { ...userWithNoProviders, reload: jest.fn() }
    }

    it('links Google account on Link button click', async () => {
      defaults()
      render(<AccountPage />)
      const links = await screen.findAllByText('Link')
      fireEvent.click(links[0])
      await waitFor(() => {
        expect(firebaseClient.linkGoogleToCurrentUser).toHaveBeenCalled()
      })
    })

    it('shows Link buttons for unlinked providers', async () => {
      defaults()
      render(<AccountPage />)
      const links = await screen.findAllByText('Link')
      expect(links.length).toBe(2)
    })
  })
})
