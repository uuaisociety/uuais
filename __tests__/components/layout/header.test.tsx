import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn(),
}))

const mockUseAdmin = jest.fn()
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => mockUseAdmin(),
}))

const g = global as { __mockPathname?: string }

function mockAdminState(overrides: Record<string, unknown> = {}) {
  mockUseAdmin.mockReturnValue({
    user: null,
    loading: false,
    isAdmin: false,
    isSuperAdmin: false,
    claims: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  })
}

describe('Header', () => {
  beforeEach(() => {
    g.__mockPathname = '/events'
    mockAdminState()
  })

  describe('navigation links', () => {
    it('renders all navigation links in desktop and mobile nav', () => {
      render(<Header />)
      expect(screen.getAllByText('Home').length).toBe(2)
      expect(screen.getAllByText('Events').length).toBe(2)
      expect(screen.getAllByText('Job board').length).toBe(2)
      expect(screen.getAllByText('About').length).toBe(2)
      expect(screen.getAllByText('Contact').length).toBe(2)
    })

    it('renders register and login links when not authenticated', () => {
      render(<Header />)
      expect(screen.getByText('Register')).toBeInTheDocument()
      expect(screen.getByText('Login')).toBeInTheDocument()
    })

    it('renders logo when not on homepage', () => {
      render(<Header />)
      expect(screen.getByText('UU AI Society')).toBeInTheDocument()
      expect(screen.getByAltText('UU AI Society Logo')).toBeInTheDocument()
    })

    it('renders theme toggle in desktop and mobile nav', () => {
      render(<Header />)
      expect(screen.getAllByTestId('theme-toggle').length).toBe(2)
    })

    it('shows spacer on non-homepage', () => {
      const { container } = render(<Header />)
      expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    })
  })

  describe('on homepage', () => {
    beforeEach(() => {
      g.__mockPathname = '/'
    })

    it('hides logo', () => {
      render(<Header />)
      expect(screen.queryByText('UU AI Society')).not.toBeInTheDocument()
    })

    it('hides spacer', () => {
      const { container } = render(<Header />)
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
    })
  })

  describe('mobile menu', () => {
    function getMobileNav(container: HTMLElement) {
      return container.querySelector('[class*="md:hidden"][class*="top-full"]')
    }

    it('mobile nav starts hidden (pointer-events-none class)', () => {
      const { container } = render(<Header />)
      const nav = getMobileNav(container)
      expect(nav?.className).toContain('pointer-events-none')
      expect(nav?.className).toContain('opacity-0')
    })

    it('toggles mobile nav when hamburger is clicked', () => {
      const { container } = render(<Header />)
      const button = screen.getByRole('button', { name: 'Open main menu' })

      fireEvent.click(button)
      const nav = getMobileNav(container)
      expect(nav?.className).not.toContain('pointer-events-none')
      expect(nav?.className).toContain('opacity-100')
    })

    it('toggles back to hidden on second click', () => {
      const { container } = render(<Header />)
      const button = screen.getByRole('button', { name: 'Open main menu' })

      fireEvent.click(button)
      fireEvent.click(button)
      const nav = getMobileNav(container)
      expect(nav?.className).toContain('pointer-events-none')
    })

    it('shows X icon when menu is open and Menu when closed', () => {
      render(<Header />)
      const button = screen.getByRole('button', { name: 'Open main menu' })

      expect(button.querySelector('.lucide-menu')).toBeInTheDocument()

      fireEvent.click(button)
      expect(button.querySelector('.lucide-x')).toBeInTheDocument()
    })
  })

  describe('authenticated state', () => {
    const mockLogout = jest.fn()

    beforeEach(() => {
      mockAdminState({
        user: { uid: 'u1', displayName: 'TestUser', email: 'a@b.com' },
        loading: false,
        isAdmin: false,
        logout: mockLogout,
      })
    })

    it('shows Account and Logout instead of Register and Login', () => {
      render(<Header />)
      expect(screen.queryByText('Register')).not.toBeInTheDocument()
      expect(screen.queryByText('Login')).not.toBeInTheDocument()
      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('shows displayName in the top bar', () => {
      render(<Header />)
      expect(screen.getByText('TestUser')).toBeInTheDocument()
    })

    it('does not show Admin link for non-admin users', () => {
      render(<Header />)
      expect(screen.queryByText('Admin')).not.toBeInTheDocument()
    })

    it('does not show Projects for non-admin users', () => {
      render(<Header />)
      expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    })
  })

  describe('admin state', () => {
    const mockLogout = jest.fn()

    beforeEach(() => {
      mockAdminState({
        user: { uid: 'admin1', displayName: 'Alice', email: 'admin@test.com' },
        loading: false,
        isAdmin: true,
        logout: mockLogout,
      })
    })

    it('shows Admin link in desktop and mobile nav (not counting profile name)', () => {
      render(<Header />)
      const adminLinks = screen.getAllByRole('link', { name: 'Admin' })
      expect(adminLinks.length).toBe(2)
    })

    it('shows Projects in both desktop and mobile nav', () => {
      render(<Header />)
      const projectsButtons = screen.getAllByText('Projects')
      expect(projectsButtons.length).toBe(2)
    })

    it('shows Account and Logout', () => {
      render(<Header />)
      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    beforeEach(() => {
      mockAdminState({ loading: true, user: null })
    })

    it('hides auth links while loading', () => {
      render(<Header />)
      expect(screen.queryByText('Register')).not.toBeInTheDocument()
      expect(screen.queryByText('Login')).not.toBeInTheDocument()
      expect(screen.queryByText('Account')).not.toBeInTheDocument()
    })
  })
})
