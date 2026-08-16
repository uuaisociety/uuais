import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import AdminDashboard from '@/components/pages/admin/AdminDashboard'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/lib/firestore/users', () => ({
  listUsers: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}))

describe('AdminDashboard tab restore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/admin')
  })

  it('restores the tab from the ?tab= query param on deep link', () => {
    window.history.replaceState(null, '', '/admin?tab=blog')
    render(<AdminDashboard />)

    expect(screen.getByText('Blog Management')).toBeInTheDocument()
    expect(screen.queryByText('Events Management')).not.toBeInTheDocument()
  })

  it('restores the tab from ?tab= on a non-default tab', () => {
    window.history.replaceState(null, '', '/admin?tab=analytics')
    render(<AdminDashboard />)

    expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0)
    expect(screen.queryByText('Events Management')).not.toBeInTheDocument()
  })

  it('falls back to localStorage when no ?tab= is present', () => {
    localStorage.setItem('adminDashboardTab', 'jobs')
    window.history.replaceState(null, '', '/admin')
    render(<AdminDashboard />)

    expect(screen.getByText('Jobs Management')).toBeInTheDocument()
  })

  it('keeps the ?tab= param across a StrictMode double-mount (dev refresh)', () => {
    window.history.replaceState(null, '', '/admin?tab=blog')
    const { unmount } = render(
      <StrictMode>
        <AdminDashboard />
      </StrictMode>
    )

    expect(screen.getByText('Blog Management')).toBeInTheDocument()
    expect(new URL(window.location.href).searchParams.get('tab')).toBe('blog')
    expect(localStorage.getItem('adminDashboardTab')).toBe('blog')

    unmount()
    const { rerender } = render(
      <StrictMode>
        <AdminDashboard />
      </StrictMode>
    )
    rerender(
      <StrictMode>
        <AdminDashboard />
      </StrictMode>
    )

    expect(screen.getByText('Blog Management')).toBeInTheDocument()
    expect(new URL(window.location.href).searchParams.get('tab')).toBe('blog')
  })
})
