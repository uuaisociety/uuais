import { render, screen, renderHook, act } from '@testing-library/react'
import { SidebarProvider, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar'

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))

jest.mock('@/components/ui/button_old', () => ({
  Button: ({ children, onClick, variant, size, ...props }: Record<string, unknown>) => (
    <button onClick={onClick as React.MouseEventHandler} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))

jest.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
}))

jest.mock('class-variance-authority', () => ({
  cva: () => () => '',
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => <div data-testid="separator" className={className} />,
}))

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-description">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-title">{children}</div>,
}))

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
}))

jest.mock('@/components/ui/input_old', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

const mockUseIsMobile = jest.requireMock('@/hooks/use-mobile').useIsMobile

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseIsMobile.mockReturnValue(false)
  })

  describe('useSidebar', () => {
    it('throws when used outside SidebarProvider', () => {
      expect(() => renderHook(() => useSidebar())).toThrow('useSidebar must be used within a SidebarProvider')
    })

    it('provides context when inside SidebarProvider', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider>{children}</SidebarProvider>
        ),
      })
      expect(result.current.open).toBe(true)
      expect(result.current.state).toBe('expanded')
      expect(result.current.isMobile).toBe(false)
    })

    it('respects defaultOpen={false}', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider defaultOpen={false}>{children}</SidebarProvider>
        ),
      })
      expect(result.current.open).toBe(false)
      expect(result.current.state).toBe('collapsed')
    })

    it('toggles open state programmatically', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider>{children}</SidebarProvider>
        ),
      })
      expect(result.current.open).toBe(true)
      act(() => result.current.toggleSidebar())
      expect(result.current.open).toBe(false)
    })

    it('can set open state directly', () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider>{children}</SidebarProvider>
        ),
      })
      act(() => result.current.setOpen(false))
      expect(result.current.open).toBe(false)
      expect(result.current.state).toBe('collapsed')
    })
  })

  describe('SidebarTrigger', () => {
    it('renders a toggle button', () => {
      render(
        <SidebarProvider>
          <SidebarTrigger />
        </SidebarProvider>
      )
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('passes data-sidebar attribute', () => {
      render(
        <SidebarProvider>
          <SidebarTrigger />
        </SidebarProvider>
      )
      expect(screen.getByRole('button')).toHaveAttribute('data-sidebar', 'trigger')
    })
  })

  describe('layout components', () => {
    it('SidebarContent renders children', () => {
      render(
        <SidebarProvider>
          <SidebarContent>
            <div data-testid="content">Content</div>
          </SidebarContent>
        </SidebarProvider>
      )
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    it('SidebarHeader renders children', () => {
      render(
        <SidebarProvider>
          <SidebarHeader>
            <div data-testid="header">Header</div>
          </SidebarHeader>
        </SidebarProvider>
      )
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    it('SidebarFooter renders children', () => {
      render(
        <SidebarProvider>
          <SidebarFooter>
            <div data-testid="footer">Footer</div>
          </SidebarFooter>
        </SidebarProvider>
      )
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  describe('SidebarGroup', () => {
    it('renders group with label and content', () => {
      render(
        <SidebarProvider>
          <SidebarGroup>
            <SidebarGroupLabel>Group Label</SidebarGroupLabel>
            <SidebarGroupContent>
              <div data-testid="group-content">Group Content</div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarProvider>
      )
      expect(screen.getByText('Group Label')).toBeInTheDocument()
      expect(screen.getByTestId('group-content')).toBeInTheDocument()
    })
  })

  describe('SidebarMenu', () => {
    it('renders menu items', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <div data-testid="menu-item">Menu Item</div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      expect(screen.getByTestId('menu-item')).toBeInTheDocument()
    })
  })

  describe('mobile behavior', () => {
    it('sets isMobile to true on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider>{children}</SidebarProvider>
        ),
      })
      expect(result.current.isMobile).toBe(true)
    })

    it('toggles openMobile instead of open when on mobile', () => {
      mockUseIsMobile.mockReturnValue(true)
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider>{children}</SidebarProvider>
        ),
      })
      expect(result.current.openMobile).toBe(false)
      act(() => result.current.toggleSidebar())
      expect(result.current.openMobile).toBe(true)
      expect(result.current.open).toBe(true)
    })

    it('toggles open on desktop', () => {
      mockUseIsMobile.mockReturnValue(false)
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider>{children}</SidebarProvider>
        ),
      })
      act(() => result.current.toggleSidebar())
      expect(result.current.open).toBe(false)
      expect(result.current.openMobile).toBe(false)
    })
  })
})
