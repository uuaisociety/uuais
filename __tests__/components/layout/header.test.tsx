import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/layout/Header'

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

const mockUseAdmin = jest.fn()
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => mockUseAdmin(),
}))

const mockUseOpenCampaigns = jest.fn()
jest.mock('@/lib/firestore/useOpenCampaigns', () => ({
  useOpenCampaigns: () => mockUseOpenCampaigns(),
}))

const g = global as { __mockPathname?: string }

function mockAdminState(overrides: Record<string, unknown> = {}) {
  mockUseAdmin.mockReturnValue({
    user: null,
    loading: false,
    isAdmin: false,
    isSuperAdmin: false,
    claims: null,
    profile: null,
    cached: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  })
}

describe('Header', () => {
  beforeEach(() => {
    g.__mockPathname = '/events'
    mockAdminState()
    global.__setAppState?.(null)
    mockUseOpenCampaigns.mockReturnValue({ campaigns: [], loaded: false })
  })

  describe('navigation links', () => {
    it('renders all navigation links in desktop and mobile nav', () => {
      render(<Header />)
      expect(screen.getAllByText('Home').length).toBe(2)
      expect(screen.getAllByText('Events').length).toBe(2)
      expect(screen.getAllByText('Job board').length).toBe(2)
      expect(screen.getAllByText('Blog').length).toBe(2)
      expect(screen.getAllByText('About').length).toBe(2)
      expect(screen.getAllByText('Contact').length).toBe(2)
    })

    it('marks the Blog link with a Beta badge', () => {
      render(<Header />)
      const blogLinks = screen.getAllByRole('link', { name: /Blog/i })
      expect(blogLinks.length).toBe(2)
      blogLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', '/blog')
        expect(link.textContent).toContain('Beta')
      })
    })

    it('renders Apply as a distinct CTA in desktop and mobile nav', () => {
      render(<Header />)
      const applyLinks = screen.getAllByRole('link', { name: 'Apply' })
      expect(applyLinks.length).toBe(2)
      applyLinks.forEach((link) => expect(link).toHaveAttribute('href', '/apply/team'))
      // CTA uses a solid background to stand out from regular nav links
      expect(applyLinks[0].className).toMatch(/bg-primary/)
    })

    it('renders register and login links when not authenticated', () => {
      render(<Header />)
      expect(screen.getAllByText('Register').length).toBe(2)
      expect(screen.getAllByText('Login').length).toBe(2)
    })

    it('always renders the logo and wordmark', () => {
      const { container } = render(<Header />)
      expect(screen.getByText('UU AI Society')).toBeInTheDocument()
      expect(container.querySelector('img')).toHaveAttribute('src', '/images/logo-highdef.png')
    })

    it('renders a single theme toggle in the nav', () => {
      render(<Header />)
      expect(screen.getAllByTestId('theme-toggle').length).toBe(1)
    })

    it('shows a constant spacer for the fixed header', () => {
      const { container } = render(<Header />)
      const spacer = container.querySelector('[aria-hidden="true"]')
      expect(spacer).toBeInTheDocument()
      expect(spacer).toHaveClass('h-14')
    })
  })

  describe('Apply CTA visibility', () => {
    it('hides Apply when campaigns are loaded and none are open', () => {
      mockUseOpenCampaigns.mockReturnValue({
        campaigns: [{ id: 'c1', status: 'closed', title: 'Closed', subtitle: '', description: '', deadline: '', teams: [], enabledStandardFields: [] }],
        loaded: true,
      })
      render(<Header />)
      expect(screen.queryByRole('link', { name: 'Apply' })).not.toBeInTheDocument()
    })

    it('shows Apply when an open campaign exists', () => {
      mockUseOpenCampaigns.mockReturnValue({
        campaigns: [{ id: 'c1', status: 'open', title: 'Open', subtitle: '', description: '', deadline: '', teams: [], enabledStandardFields: [] }],
        loaded: true,
      })
      render(<Header />)
      expect(screen.getAllByRole('link', { name: 'Apply' }).length).toBe(2)
    })

    it('shows Apply while campaigns are still loading', () => {
      mockUseOpenCampaigns.mockReturnValue({ campaigns: [], loaded: false })
      render(<Header />)
      expect(screen.getAllByRole('link', { name: 'Apply' }).length).toBe(2)
    })
  })

  describe('on homepage', () => {
    beforeEach(() => {
      g.__mockPathname = '/'
      global.__setMockTheme?.('dark')
    })

    it('still shows the logo and wordmark', () => {
      render(<Header />)
      expect(screen.getByText('UU AI Society')).toBeInTheDocument()
    })

    it('still shows the spacer', () => {
      const { container } = render(<Header />)
      const spacer = container.querySelector('[aria-hidden="true"]')
      expect(spacer).toBeInTheDocument()
      expect(spacer).toHaveClass('h-14')
    })

    it('uses the theme-aware glass nav on the homepage in dark mode', () => {
      const { container } = render(<Header />)
      expect(container.querySelector('header')?.className).toContain('glass-nav')
    })

    it('uses the theme-aware glass nav on the homepage in light mode', () => {
      global.__setMockTheme?.('light')
      const { container } = render(<Header />)
      expect(container.querySelector('header')?.className).toContain('glass-nav')
    })
  })

  describe('mobile menu', () => {
    function getMobileNav(container: HTMLElement) {
      return container.querySelector('#mobile-menu')
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

    it('closes mobile menu when clicking outside', () => {
      const { container } = render(<Header />)
      const button = screen.getByRole('button', { name: 'Open main menu' })

      fireEvent.click(button)
      const nav = getMobileNav(container)
      expect(nav?.className).not.toContain('pointer-events-none')

      // Click outside menu (on document) triggers click outside handler
      fireEvent.mouseDown(document)
      expect(nav?.className).toContain('pointer-events-none')
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

    it('shows username as account link and Logout instead of Register and Login', () => {
      render(<Header />)
      expect(screen.queryByText('Register')).not.toBeInTheDocument()
      expect(screen.queryByText('Login')).not.toBeInTheDocument()
      const accountLinks = screen.getAllByRole('link', { name: 'TestUser' })
      expect(accountLinks.length).toBe(2)
      accountLinks.forEach((link) => expect(link).toHaveAttribute('href', '/account'))
      expect(screen.getAllByText('Logout').length).toBe(2)
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

    it('shows Admin link in desktop and mobile nav', () => {
      render(<Header />)
      const adminLinks = screen.getAllByRole('link', { name: 'Admin' })
      expect(adminLinks.length).toBe(2)
    })

    it('shows a Projects dropdown trigger in desktop nav', () => {
      render(<Header />)
      const projectsButtons = screen.getAllByText('Projects')
      expect(projectsButtons.length).toBe(1)
    })

    it('shows username as account link and Logout', () => {
      render(<Header />)
      const accountLinks = screen.getAllByRole('link', { name: 'Alice' })
      expect(accountLinks.length).toBe(2)
      accountLinks.forEach((link) => expect(link).toHaveAttribute('href', '/account'))
      expect(screen.getAllByText('Logout').length).toBe(2)
    })
  })

  describe('projects dropdown (admin)', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      mockAdminState({
        user: { uid: 'admin1', displayName: 'Alice', email: 'admin@test.com' },
        loading: false,
        isAdmin: true,
      })
    })

    it('opens and shows project links on desktop', () => {
      render(<Header />)
      // Desktop Projects button is first in DOM
      const desktopProjectsBtn = screen.getAllByText('Projects')[0]

      // Before click: mobile menu always lists the project links
      expect(screen.getAllByText('All projects').length).toBe(1)

      fireEvent.click(desktopProjectsBtn)

      // After click: desktop dropdown renders, so the links now appear twice
      // (desktop dropdown + mobile menu)
      expect(screen.getAllByText('All projects').length).toBe(2)
      expect(screen.getAllByText('Course navigator').length).toBe(2)
      expect(screen.getAllByText('My favourites').length).toBe(2)
    })

    it('closes dropdown when clicking outside', () => {
      render(<Header />)

      const desktopProjectsBtn = screen.getAllByText('Projects')[0]
      fireEvent.click(desktopProjectsBtn)
      expect(screen.getAllByText('All projects').length).toBe(2)

      // Click outside triggers the mousedown handler
      fireEvent.mouseDown(document)

      // Desktop dropdown removed, only the mobile link remains
      expect(screen.getAllByText('All projects').length).toBe(1)
    })
  })

  describe('logout', () => {
    const mockLogout = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
      mockAdminState({
        user: { uid: 'u1', displayName: 'TestUser', email: 'u@test.com' },
        loading: false,
        isAdmin: false,
        logout: mockLogout,
      })
    })

    it('calls logout function when Logout button is clicked', () => {
      render(<Header />)
      const logoutButton = screen.getAllByText('Logout')[0]
      fireEvent.click(logoutButton)
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })
})
