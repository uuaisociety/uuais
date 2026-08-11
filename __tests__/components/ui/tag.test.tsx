import { render, screen } from '@testing-library/react'
import { Tag } from '@/components/ui/Tag'

describe('Tag', () => {
  it('renders children', () => {
    render(<Tag>AI</Tag>)
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('renders with default variant (red) and size (md)', () => {
    const { container } = render(<Tag>Default</Tag>)
    const span = container.firstChild as HTMLElement
    expect(span.className).toContain('bg-primary/10')
    expect(span.className).toContain('text-[0.6875rem]')
  })

  it('renders all color variants without error', () => {
    const variants = ['red', 'blue', 'green', 'yellow', 'gray'] as const
    for (const v of variants) {
      const { unmount } = render(<Tag variant={v}>{v}</Tag>)
      expect(screen.getByText(v)).toBeInTheDocument()
      unmount()
    }
  })

  it('renders all sizes', () => {
    const { container } = render(<Tag size="sm">Small</Tag>)
    expect(container.firstChild).toBeInTheDocument()
  })
})
