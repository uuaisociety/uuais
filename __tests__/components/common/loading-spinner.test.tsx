import { render } from '@testing-library/react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default md size', () => {
    const { container } = render(<LoadingSpinner />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('h-8 w-8')
    expect(div.className).toContain('animate-spin')
  })

  it('renders with sm size', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('h-4 w-4')
  })

  it('renders with lg size', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('h-12 w-12')
  })

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="my-custom-class" />)
    const div = container.firstChild as HTMLElement
    expect(div.className).toContain('my-custom-class')
  })
})
