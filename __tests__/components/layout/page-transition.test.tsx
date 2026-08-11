import { render, screen } from '@testing-library/react'
import { PageTransition } from '@/components/layout/PageTransition'

const g = global as { __mockPathname?: string }

describe('PageTransition', () => {
  beforeEach(() => {
    g.__mockPathname = '/'
  })

  it('renders its children', () => {
    render(<PageTransition><span>Hello page</span></PageTransition>)
    expect(screen.getByText('Hello page')).toBeInTheDocument()
  })

  it('does not animate the initial page load', () => {
    const { container } = render(<PageTransition><span>Home</span></PageTransition>)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).not.toContain('animate-page-in')
  })

  it('fades the content in when navigating to a new route', () => {
    const { container, rerender } = render(<PageTransition><span>Home</span></PageTransition>)
    g.__mockPathname = '/events'
    rerender(<PageTransition><span>Events</span></PageTransition>)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('animate-page-in')
    expect(wrapper.textContent).toContain('Events')
  })

  it('re-runs the transition between dynamic routes of the same page', () => {
    const { container, rerender } = render(<PageTransition><span>Event 1</span></PageTransition>)
    g.__mockPathname = '/events/2'
    rerender(<PageTransition><span>Event 2</span></PageTransition>)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('animate-page-in')
    expect(wrapper.textContent).toContain('Event 2')
  })
})
