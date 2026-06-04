import { render, screen, renderHook, act, fireEvent } from '@testing-library/react'
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarGroupAction, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarInput, SidebarInset, SidebarSeparator, SidebarRail, useSidebar } from '@/components/ui/sidebar'

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

  describe('Sidebar collapsible="none"', () => {
    it('renders with data-slot="sidebar" and children', () => {
      render(
        <SidebarProvider>
          <Sidebar collapsible="none" data-testid="sidebar">
            <div data-testid="none-content">Collapsible None</div>
          </Sidebar>
        </SidebarProvider>
      )
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-slot', 'sidebar')
      expect(screen.getByTestId('none-content')).toBeInTheDocument()
    })
  })

  describe('SidebarRail', () => {
    it('renders with data-sidebar="rail" and aria-label', () => {
      const TestRail = () => {
        const { open } = useSidebar()
        return (
          <div>
            <span data-testid="rail-state">{open ? 'open' : 'closed'}</span>
            <SidebarRail />
          </div>
        )
      }
      render(
        <SidebarProvider>
          <TestRail />
        </SidebarProvider>
      )
      const rail = screen.getByRole('button')
      expect(rail).toHaveAttribute('data-sidebar', 'rail')
      expect(rail).toHaveAttribute('aria-label', 'Toggle Sidebar')
    })

    it('toggles sidebar when clicked', () => {
      const TestRail = () => {
        const { open } = useSidebar()
        return (
          <div>
            <span data-testid="rail-state">{open ? 'open' : 'closed'}</span>
            <SidebarRail />
          </div>
        )
      }
      render(
        <SidebarProvider>
          <TestRail />
        </SidebarProvider>
      )
      expect(screen.getByTestId('rail-state')).toHaveTextContent('open')
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByTestId('rail-state')).toHaveTextContent('closed')
    })
  })

  describe('keyboard shortcut (Ctrl+B)', () => {
    it('toggles sidebar open with Ctrl+B', () => {
      const TestKeys = () => {
        const { open } = useSidebar()
        return <span data-testid="key-state">{open ? 'open' : 'closed'}</span>
      }
      render(
        <SidebarProvider>
          <TestKeys />
        </SidebarProvider>
      )
      expect(screen.getByTestId('key-state')).toHaveTextContent('open')
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
      expect(screen.getByTestId('key-state')).toHaveTextContent('closed')
    })

    it('toggles sidebar open with Meta+B', () => {
      const TestKeys = () => {
        const { open } = useSidebar()
        return <span data-testid="key-state-meta">{open ? 'open' : 'closed'}</span>
      }
      render(
        <SidebarProvider defaultOpen={false}>
          <TestKeys />
        </SidebarProvider>
      )
      expect(screen.getByTestId('key-state-meta')).toHaveTextContent('closed')
      fireEvent.keyDown(window, { key: 'b', metaKey: true })
      expect(screen.getByTestId('key-state-meta')).toHaveTextContent('open')
    })
  })

  describe('controlled open/onOpenChange', () => {
    it('calls onOpenChange when toggleSidebar is called in controlled mode', () => {
      const onChange = jest.fn()
      const { result } = renderHook(() => useSidebar(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SidebarProvider open={true} onOpenChange={onChange}>
            {children}
          </SidebarProvider>
        ),
      })
      act(() => result.current.toggleSidebar())
      expect(onChange).toHaveBeenCalledWith(false)
    })
  })

  describe('SidebarInput', () => {
    it('renders with data-slot="sidebar-input"', () => {
      render(
        <SidebarProvider>
          <SidebarInput placeholder="Search..." />
        </SidebarProvider>
      )
      const input = screen.getByPlaceholderText('Search...')
      expect(input).toHaveAttribute('data-slot', 'sidebar-input')
    })
  })

  describe('SidebarSeparator', () => {
    it('renders separator element', () => {
      render(
        <SidebarProvider>
          <SidebarSeparator />
        </SidebarProvider>
      )
      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })
  })

  describe('SidebarInset', () => {
    it('renders with data-slot="sidebar-inset"', () => {
      render(
        <SidebarProvider>
          <SidebarInset data-testid="sidebar-inset" />
        </SidebarProvider>
      )
      expect(screen.getByTestId('sidebar-inset')).toHaveAttribute('data-slot', 'sidebar-inset')
    })
  })

  describe('SidebarMenuSkeleton', () => {
    it('renders skeleton elements', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBe(1)
    })

    it('renders additional skeleton when showIcon is true', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBe(2)
    })
  })

  describe('SidebarMenuButton with tooltip', () => {
    it('renders tooltip wrapper when tooltip prop is provided', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="My Tooltip">
                Item
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument()
    })

    it('does not render tooltip when tooltip prop is not provided', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Item</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('SidebarMenuSub and children', () => {
    it('renders SidebarMenuSub with data-slot attributes', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSub data-testid="sidebar-menu-sub">
                <SidebarMenuSubItem data-testid="sidebar-menu-sub-item">
                  <SidebarMenuSubButton data-testid="sidebar-menu-sub-button">Sub Item</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      expect(screen.getByTestId('sidebar-menu-sub')).toHaveAttribute('data-slot', 'sidebar-menu-sub')
      expect(screen.getByTestId('sidebar-menu-sub-item')).toHaveAttribute('data-slot', 'sidebar-menu-sub-item')
      expect(screen.getByTestId('sidebar-menu-sub-button')).toHaveAttribute('data-slot', 'sidebar-menu-sub-button')
      expect(screen.getByText('Sub Item')).toBeInTheDocument()
    })
  })

  describe('SidebarGroupAction', () => {
    it('renders with data-slot="sidebar-group-action"', () => {
      render(
        <SidebarProvider>
          <SidebarGroup>
            <SidebarGroupAction data-testid="sidebar-group-action">+</SidebarGroupAction>
          </SidebarGroup>
        </SidebarProvider>
      )
      const action = screen.getByTestId('sidebar-group-action')
      expect(action).toHaveAttribute('data-slot', 'sidebar-group-action')
    })
  })

  describe('SidebarMenuAction', () => {
    it('renders with data-slot="sidebar-menu-action"', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuAction data-testid="sidebar-menu-action">x</SidebarMenuAction>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      const action = screen.getByTestId('sidebar-menu-action')
      expect(action).toHaveAttribute('data-slot', 'sidebar-menu-action')
    })
  })

  describe('SidebarMenuBadge', () => {
    it('renders with data-slot="sidebar-menu-badge"', () => {
      render(
        <SidebarProvider>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuBadge data-testid="sidebar-menu-badge">3</SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarProvider>
      )
      const badge = screen.getByTestId('sidebar-menu-badge')
      expect(badge).toHaveAttribute('data-slot', 'sidebar-menu-badge')
    })
  })
})
