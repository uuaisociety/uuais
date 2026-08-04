import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/layout/Header'
import { getUserProfile } from '@/lib/firestore/users'

const mockGetUserProfile = getUserProfile as jest.Mock

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
    global.__setAppState?.(null)
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

    it('renders Apply as a distinct CTA in desktop and mobile nav', () => {
      render(<Header />)
      const applyLinks = screen.getAllByRole('link', { name: 'Apply' })
      expect(applyLinks.length).toBe(2)
      applyLinks.forEach((link) => expect(link).toHaveAttribute('href', '/apply/team'))
      // CTA uses a solid background to stand out from regular nav links
      expect(applyLinks[0].className).toMatch(/bg-red-600|bg-white/)
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
      expect(container.querySelector('div.h-\\[100px\\]')).toBeInTheDocument()
    })
  })

  describe('Apply CTA visibility', () => {
    it('hides Apply when campaigns are loaded and none are open', () => {
      global.__setAppState?.({
        campaigns: [{ id: 'c1', status: 'closed', title: 'Closed', subtitle: '', description: '', deadline: '', teams: [], enabledStandardFields: [] }],
        campaignsLoaded: true,
      })
      render(<Header />)
      expect(screen.queryByRole('link', { name: 'Apply' })).not.toBeInTheDocument()
    })

    it('shows Apply when an open campaign exists', () => {
      global.__setAppState?.({
        campaigns: [{ id: 'c1', status: 'open', title: 'Open', subtitle: '', description: '', deadline: '', teams: [], enabledStandardFields: [] }],
        campaignsLoaded: true,
      })
      render(<Header />)
      expect(screen.getAllByRole('link', { name: 'Apply' }).length).toBe(2)
    })

    it('shows Apply while campaigns are still loading', () => {
      global.__setAppState?.(null)
      render(<Header />)
      expect(screen.getAllByRole('link', { name: 'Apply' }).length).toBe(2)
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
      const spacer = container.querySelector('[aria-hidden="true"]')
      expect(spacer).toBeInTheDocument()
      expect(spacer).toHaveClass('h-0')
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

    it('closes mobile menu when a nav link is clicked', () => {
      const { container } = render(<Header />)
      const button = screen.getByRole('button', { name: 'Open main menu' })

      fireEvent.click(button)
      const nav = getMobileNav(container)
      expect(nav?.className).not.toContain('pointer-events-none')

      // Click a mobile nav link triggers onClick={() => setIsMenuOpen(false)}
      const eventsLinks = screen.getAllByText('Events')
      fireEvent.click(eventsLinks[1])

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

    it('hides auth links while loading even when user is set', () => {
      mockAdminState({ loading: true, user: { uid: 'u1', displayName: 'Test' } })
      render(<Header />)
      expect(screen.queryByText('Register')).not.toBeInTheDocument()
      expect(screen.queryByText('Login')).not.toBeInTheDocument()
      expect(screen.queryByText('Account')).not.toBeInTheDocument()
    })
  })

  describe('projects dropdown (admin)', () => {
    const mockLogout = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
      mockAdminState({
        user: { uid: 'admin1', displayName: 'Alice', email: 'admin@test.com' },
        loading: false,
        isAdmin: true,
        logout: mockLogout,
      })
    })

    it('opens and shows project links on desktop', () => {
      render(<Header />)
      // Desktop Projects button is first in DOM
      const desktopProjectsBtn = screen.getAllByText('Projects')[0]

      // Before click: only mobile "All Projects" exists (CSS-hidden in DOM)
      expect(screen.getAllByText('All Projects').length).toBe(1)

      fireEvent.click(desktopProjectsBtn)

      // After click: desktop dropdown renders, so "All Projects" now appears twice
      expect(screen.getAllByText('All Projects').length).toBe(2)
      // "My Favorites" is desktop-dropdown-only (appears when user is logged in)
      expect(screen.getByText('My Favorites')).toBeInTheDocument()
    })

    it('hides My Favorites when user is not logged in', () => {
      mockAdminState({
        user: null,
        loading: false,
        isAdmin: true,
      })
      render(<Header />)

      const desktopProjectsBtn = screen.getAllByText('Projects')[0]
      fireEvent.click(desktopProjectsBtn)

      // Desktop dropdown still opens (All Projects count goes to 2)
      expect(screen.getAllByText('All Projects').length).toBe(2)
      // But My Favorites is conditional on user being logged in
      expect(screen.queryByText('My Favorites')).not.toBeInTheDocument()
    })

    it('closes dropdown when clicking a link', () => {
      render(<Header />)

      const desktopProjectsBtn = screen.getAllByText('Projects')[0]
      fireEvent.click(desktopProjectsBtn)
      expect(screen.getAllByText('All Projects').length).toBe(2)

      // Click the desktop "All Projects" link (first one in DOM)
      const allProjectsLinks = screen.getAllByText('All Projects')
      fireEvent.click(allProjectsLinks[0])

      // Dropdown closes: desktop links removed, only mobile remains
      expect(screen.getAllByText('All Projects').length).toBe(1)
      expect(screen.queryByText('My Favorites')).not.toBeInTheDocument()
    })

    it('closes dropdown when clicking outside', () => {
      render(<Header />)

      const desktopProjectsBtn = screen.getAllByText('Projects')[0]
      fireEvent.click(desktopProjectsBtn)
      expect(screen.getAllByText('All Projects').length).toBe(2)

      // Click outside triggers the mousedown handler
      fireEvent.mouseDown(document)

      // Desktop dropdown removed, only mobile remains
      expect(screen.getAllByText('All Projects').length).toBe(1)
      expect(screen.queryByText('My Favorites')).not.toBeInTheDocument()
    })
  })

  describe('projects mobile section for admin', () => {
    beforeEach(() => {
      mockAdminState({
        user: { uid: 'admin1', displayName: 'Alice', email: 'admin@test.com' },
        loading: false,
        isAdmin: true,
      })
    })

    it('opens mobile projects submenu and shows links', () => {
      render(<Header />)
      // Open mobile menu first
      const hamburger = screen.getByRole('button', { name: 'Open main menu' })
      fireEvent.click(hamburger)

      // Mobile Projects button is second in DOM
      const mobileProjectsBtn = screen.getAllByText('Projects')[1]
      fireEvent.click(mobileProjectsBtn)

      // "Study Plan Graph" is unique to the mobile projects submenu
      expect(screen.getByText('Study Plan Graph')).toBeInTheDocument()
      // All Projects and Course Navigator appear in both desktop and mobile, so they exist
      expect(screen.getAllByText('All Projects').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Course Navigator').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getUserProfile fetch', () => {
    beforeEach(() => {
      mockAdminState({
        user: { uid: 'u1', displayName: 'AuthName', email: 'user@test.com' },
        loading: false,
        isAdmin: false,
      })
      mockGetUserProfile.mockReset()
    })

    it('calls getUserProfile with user uid', () => {
      mockGetUserProfile.mockResolvedValue(null)
      render(<Header />)
      expect(mockGetUserProfile).toHaveBeenCalledWith('u1')
    })

    it('shows profile displayName when available', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'u1',
        displayName: 'ProfileName',
        name: 'RealName',
      })
      render(<Header />)
      // profile.displayName takes highest precedence
      // Use findByText because getUserProfile is async (effect runs after render)
      await expect(screen.findByText('ProfileName')).resolves.toBeInTheDocument()
    })

    it('shows profile name when no displayName', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'u1',
        name: 'RealName',
      })
      render(<Header />)
      // Falls through to profile.name
      await expect(screen.findByText('RealName')).resolves.toBeInTheDocument()
    })

    it('falls back to auth displayName when no profile is found', () => {
      mockGetUserProfile.mockResolvedValue(null)
      render(<Header />)
      // Falls through to user.displayName ('AuthName')
      expect(screen.getByText('AuthName')).toBeInTheDocument()
    })

    it('handles getUserProfile error gracefully', () => {
      mockGetUserProfile.mockRejectedValue(new Error('network error'))
      render(<Header />)
      // Catch block sets profile to null, falls back to user.displayName
      expect(screen.getByText('AuthName')).toBeInTheDocument()
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

    it('calls logout function when Logout link is clicked', () => {
      render(<Header />)
      const logoutLink = screen.getByText('Logout')
      fireEvent.click(logoutLink)
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  describe('community dropdown (public)', () => {
    it('renders Community in desktop nav and mobile menu', () => {
      render(<Header />)
      expect(screen.getByRole('button', { name: 'Community' })).toBeInTheDocument()
      expect(screen.getAllByText('Community').length).toBe(2)
    })

    it('opens and shows the Member Showcase link on desktop', () => {
      render(<Header />)
      const communityBtn = screen.getByRole('button', { name: 'Community' })
      fireEvent.click(communityBtn)
      expect(screen.getByText('Member Showcase')).toBeInTheDocument()
    })

    it('closes dropdown when clicking outside', () => {
      render(<Header />)
      const communityBtn = screen.getByRole('button', { name: 'Community' })
      fireEvent.click(communityBtn)
      expect(screen.getByText('Member Showcase')).toBeInTheDocument()
      fireEvent.mouseDown(document)
      expect(screen.queryByText('Member Showcase')).not.toBeInTheDocument()
    })

    it('closes dropdown when pressing Escape', () => {
      render(<Header />)
      const communityBtn = screen.getByRole('button', { name: 'Community' })
      fireEvent.click(communityBtn)
      expect(screen.getByText('Member Showcase')).toBeInTheDocument()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByText('Member Showcase')).not.toBeInTheDocument()
    })

    it('Escape closes the mobile menu', () => {
      const { container } = render(<Header />)
      const hamburger = screen.getByRole('button', { name: 'Open main menu' })
      fireEvent.click(hamburger)
      const nav = container.querySelector('[class*="md:hidden"][class*="top-full"]')
      expect(nav?.className).not.toContain('pointer-events-none')
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(nav?.className).toContain('pointer-events-none')
    })

    it('links to the showcase page', () => {
      render(<Header />)
      const communityBtn = screen.getByRole('button', { name: 'Community' })
      fireEvent.click(communityBtn)
      const showcaseLink = screen.getByText('Member Showcase')
      expect(showcaseLink).toHaveAttribute('href', '/showcase')
    })
  })
})
