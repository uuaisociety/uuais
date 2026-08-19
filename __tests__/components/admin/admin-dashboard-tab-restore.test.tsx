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

// AdminDashboard reads auth.currentUser; mock the client so tests run without
// Firebase env vars (CI has none).
jest.mock('@/lib/firebase-client', () => ({
  auth: { currentUser: { uid: 'test-admin', displayName: 'Test Admin' } },
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

    expect(screen.getByRole('heading', { level: 2, name: 'Blog' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Events' })).not.toBeInTheDocument()
  })

  it('restores the tab from ?tab= on a non-default tab', () => {
    window.history.replaceState(null, '', '/admin?tab=analytics')
    render(<AdminDashboard />)

    expect(screen.getAllByRole('heading', { level: 2, name: 'Analytics' }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('heading', { level: 2, name: 'Events' }).length).toBe(0)
  })

  it('restores the analytics sub-tab from ?tab=&sub= deep link', () => {
    window.history.replaceState(null, '', '/admin?tab=analytics&sub=firebase')
    render(<AdminDashboard />)

    const firebaseSub = screen.getByRole('button', { name: 'Firebase' })
    expect(firebaseSub).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 2, name: 'Analytics' })).toBeInTheDocument()
  })

  it('restores the blog sub-tab from ?tab=&sub= deep link', () => {
    window.history.replaceState(null, '', '/admin?tab=blog&sub=ai-settings')
    render(<AdminDashboard />)

    const aiSub = screen.getByRole('button', { name: 'AI News Desk' })
    expect(aiSub).toHaveAttribute('aria-current', 'page')
    // The top-level Blog tab is active (not the Posts default).
    expect(screen.queryByRole('button', { name: 'Posts' })).not.toHaveAttribute('aria-current', 'page')
  })

  it('defaults an unknown ?sub= value to the first sub-tab', () => {
    window.history.replaceState(null, '', '/admin?tab=analytics&sub=nonsense')
    render(<AdminDashboard />)

    const summarySub = screen.getByRole('button', { name: 'Summary' })
    expect(summarySub).toHaveAttribute('aria-current', 'page')
  })

  it('falls back to localStorage when no ?tab= is present', () => {
    localStorage.setItem('adminDashboardTab', 'jobs')
    window.history.replaceState(null, '', '/admin')
    render(<AdminDashboard />)

    expect(screen.getByRole('heading', { level: 2, name: 'Jobs' })).toBeInTheDocument()
  })

  it('keeps the ?tab= param across a StrictMode double-mount (dev refresh)', () => {
    window.history.replaceState(null, '', '/admin?tab=blog')
    const { unmount } = render(
      <StrictMode>
        <AdminDashboard />
      </StrictMode>
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Blog' })).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { level: 2, name: 'Blog' })).toBeInTheDocument()
    expect(new URL(window.location.href).searchParams.get('tab')).toBe('blog')
  })
})
