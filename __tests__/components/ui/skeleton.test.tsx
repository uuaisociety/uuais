import { render } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('renders with data-slot attribute', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveAttribute('data-slot', 'skeleton')
  })

  it('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />)
    expect(container.firstChild).toHaveClass('h-10')
    expect(container.firstChild).toHaveClass('w-full')
  })
})
