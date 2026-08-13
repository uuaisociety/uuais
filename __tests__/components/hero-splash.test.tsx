import { render, screen } from '@testing-library/react'
import { HeroSplash, DARK_SPLASH, LIGHT_SPLASH } from '@/components/HeroSplash'

describe('HeroSplash', () => {
  beforeEach(() => {
    global.__setMockTheme?.('dark')
  })

  it('renders children', () => {
    render(
      <HeroSplash>
        <span>Hero content</span>
      </HeroSplash>
    )
    expect(screen.getByText('Hero content')).toBeInTheDocument()
  })

  it('renders a dark ink slab in dark mode', () => {
    const { container } = render(<HeroSplash />)
    const section = container.querySelector('section')
    expect(section?.className).toContain('bg-ink')
    expect(section?.className).toContain('text-white')
    // The splash layer sits behind the content and never intercepts events
    const splash = container.querySelector('[aria-hidden="true"]')
    expect(splash?.className).toContain('absolute')
    expect(splash?.className).toContain('pointer-events-none')
  })

  it('renders a white paper slab in light mode', () => {
    global.__setMockTheme?.('light')
    const { container } = render(<HeroSplash />)
    const section = container.querySelector('section')
    expect(section?.className).toContain('bg-card')
    expect(section?.className).toContain('text-foreground')
  })

  it('uses an ink-tinted splash in dark mode and a cool light splash in light mode', () => {
    expect(DARK_SPLASH).toContain('from var(--primary)')
    expect(DARK_SPLASH).toContain('from var(--ink)')
    expect(LIGHT_SPLASH).toContain('from var(--primary)')
    expect(LIGHT_SPLASH).toContain('from var(--ambient-2)')
    expect(LIGHT_SPLASH).not.toContain('from var(--ink)')
  })

  it('passes geometry classes through to the section', () => {
    const { container } = render(<HeroSplash className="-mt-14 min-h-[50vh]" />)
    const section = container.querySelector('section')
    expect(section?.className).toContain('-mt-14')
    expect(section?.className).toContain('min-h-[50vh]')
  })
})
