import { render, screen, fireEvent, act } from '@testing-library/react'

// Mock matchMedia before any imports
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  })
})

// Helper component that reads and displays theme state
function ThemeConsumer() {
  const { useTheme } = jest.requireActual('@/providers/ThemeProvider')
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>Toggle</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('renders children after mounting', async () => {
    const { ThemeProvider } = jest.requireActual('@/providers/ThemeProvider')
    render(
      <ThemeProvider>
        <p>child</p>
      </ThemeProvider>
    )
    await screen.findByText('child')
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  it('defaults to light theme when no saved preference and system is light', async () => {
    const { ThemeProvider } = jest.requireActual('@/providers/ThemeProvider')
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    const val = await screen.findByTestId('theme-value')
    expect(val.textContent).toBe('light')
  })

  it('persists theme to localStorage after toggle', async () => {
    const { ThemeProvider } = jest.requireActual('@/providers/ThemeProvider')
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    await screen.findByText('Toggle')
    act(() => { fireEvent.click(screen.getByTestId('toggle-btn')) })

    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('reads saved theme from localStorage on mount', async () => {
    localStorage.setItem('theme', 'dark')
    const { ThemeProvider } = jest.requireActual('@/providers/ThemeProvider')
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    const val = await screen.findByTestId('theme-value')
    expect(val.textContent).toBe('dark')
  })

  it('toggles between light and dark', async () => {
    const { ThemeProvider } = jest.requireActual('@/providers/ThemeProvider')
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    const toggleBtn = await screen.findByTestId('toggle-btn')
    const val = screen.getByTestId('theme-value')

    expect(val.textContent).toBe('light')
    act(() => { fireEvent.click(toggleBtn) })
    expect(val.textContent).toBe('dark')
    act(() => { fireEvent.click(toggleBtn) })
    expect(val.textContent).toBe('light')
  })

  it('sets document.documentElement class when theme changes', async () => {
    const { ThemeProvider } = jest.requireActual('@/providers/ThemeProvider')
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )
    await screen.findByTestId('theme-value')

    // After mount, the html element should have the current theme class
    const html = document.documentElement
    const hasLightOrDark = html.classList.contains('light') || html.classList.contains('dark')
    expect(hasLightOrDark).toBe(true)

    // Toggle and check class changed
    act(() => { fireEvent.click(screen.getByTestId('toggle-btn')) })
    expect(html.classList.contains('dark')).toBe(true)
    expect(html.classList.contains('light')).toBe(false)
  })

  it('syncs multiple consumers to the same theme', async () => {
    const { ThemeProvider } = jest.requireActual('@/providers/ThemeProvider')
    render(
      <ThemeProvider>
        <ThemeConsumer />
        <ThemeConsumer />
      </ThemeProvider>
    )
    const values = await screen.findAllByTestId('theme-value')
    expect(values).toHaveLength(2)
    expect(values[0].textContent).toBe(values[1].textContent)

    act(() => { fireEvent.click(screen.getAllByTestId('toggle-btn')[0]) })
    expect(values[0].textContent).toBe('dark')
    expect(values[1].textContent).toBe('dark')
  })

  it('throws when useTheme is used outside provider', () => {
    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within a ThemeProvider')
  })
})
