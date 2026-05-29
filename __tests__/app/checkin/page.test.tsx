import { render, screen } from '@testing-library/react'
import CheckinPage from '@/app/checkin/page'

const mockSearchParamsGet = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter() { return { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() } },
  usePathname() { return '' },
  useParams() { return {} },
  useSearchParams() { return { get: (key: string) => mockSearchParamsGet(key) } },
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

const mockUseAdmin = jest.fn()
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => mockUseAdmin(),
}))

const mockSetAttendanceForUser = jest.fn()
jest.mock('@/lib/firestore/attendance', () => ({
  setAttendanceForUser: (...args: unknown[]) => mockSetAttendanceForUser(...args),
}))

const mockGetUserProfile = jest.fn()
jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}))

jest.mock('@/components/ui/LoginModal', () => ({
  __esModule: true,
  default: () => null,
}))

const defaultAdminState = {
  user: { uid: 'admin-1' },
  loading: false,
  isAdmin: true,
  isSuperAdmin: false,
  claims: null,
  signInWithGoogle: jest.fn(),
  logout: jest.fn(),
}

describe('CheckinPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParamsGet.mockReset()
    mockUseAdmin.mockReset()
    mockSetAttendanceForUser.mockReset()
    mockGetUserProfile.mockReset()
  })

  it('shows AdminGate loading state while checking permissions', () => {
    mockUseAdmin.mockReturnValue({ ...defaultAdminState, user: null, loading: true, isAdmin: false })
    render(<CheckinPage />)
    expect(screen.getByText('Checking permissions...')).toBeInTheDocument()
  })

  it('shows admin access required for non-admin signed-in users', () => {
    mockUseAdmin.mockReturnValue({ ...defaultAdminState, isAdmin: false })
    render(<CheckinPage />)
    expect(screen.getByText('Admin Access Required')).toBeInTheDocument()
  })

  describe('as admin user', () => {
    beforeEach(() => {
      mockUseAdmin.mockReturnValue(defaultAdminState)
    })

    it('shows missing params error when eventId and userId are empty', async () => {
      mockSearchParamsGet.mockReturnValue('')
      render(<CheckinPage />)
      expect(
        await screen.findByText('Missing event or user information in URL.'),
      ).toBeInTheDocument()
    })

    it('records attendance and shows success message', async () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'eventId') return 'event-1'
        if (key === 'userId') return 'user-1'
        return ''
      })
      mockSetAttendanceForUser.mockResolvedValue(undefined)
      mockGetUserProfile.mockResolvedValue({ name: 'Jane Doe' })
      render(<CheckinPage />)
      expect(await screen.findByText('Attendance has been recorded.')).toBeInTheDocument()
      expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
      expect(mockSetAttendanceForUser).toHaveBeenCalledWith('event-1', 'user-1', true)
    })

    it('shows error message when setAttendanceForUser rejects', async () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'eventId') return 'event-1'
        if (key === 'userId') return 'user-1'
        return ''
      })
      mockSetAttendanceForUser.mockRejectedValue(new Error('Attendance already recorded'))
      mockGetUserProfile.mockResolvedValue({ name: 'Jane Doe' })
      render(<CheckinPage />)
      expect(await screen.findByText('Attendance already recorded')).toBeInTheDocument()
    })

    it('uses fallback message when error is not an Error instance', async () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'eventId') return 'event-1'
        if (key === 'userId') return 'user-1'
        return ''
      })
      mockSetAttendanceForUser.mockRejectedValue('string error')
      mockGetUserProfile.mockResolvedValue({ name: 'Jane Doe' })
      render(<CheckinPage />)
      expect(
        await screen.findByText('Failed to record attendance.'),
      ).toBeInTheDocument()
    })

    it('shows user not found when getUserProfile returns null', async () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'eventId') return 'event-1'
        if (key === 'userId') return 'user-1'
        return ''
      })
      mockSetAttendanceForUser.mockResolvedValue(undefined)
      mockGetUserProfile.mockResolvedValue(null)
      render(<CheckinPage />)
      expect(await screen.findByText('User not found.')).toBeInTheDocument()
    })
  })
})
