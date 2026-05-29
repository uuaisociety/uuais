import { render, screen } from '@testing-library/react'
import { Card, CardContent, CardHeader, CardMedia } from '@/components/ui/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>content</p></Card>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders with default variant classes', () => {
    const { container } = render(<Card />)
    expect(container.firstChild).toHaveClass('shadow-sm')
  })

  it('renders with elevated variant', () => {
    const { container } = render(<Card variant="elevated" />)
    expect(container.firstChild).toHaveClass('shadow-md')
  })

  it('applies custom className', () => {
    const { container } = render(<Card className="my-class" />)
    expect(container.firstChild).toHaveClass('my-class')
  })
})

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent><p>inner</p></CardContent>)
    expect(screen.getByText('inner')).toBeInTheDocument()
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader><h2>title</h2></CardHeader>)
    expect(screen.getByText('title')).toBeInTheDocument()
  })
})

describe('CardMedia', () => {
  it('renders image with alt text', () => {
    render(<CardMedia src="/test.jpg" alt="test image" />)
    expect(screen.getByAltText('test image')).toBeInTheDocument()
  })
})
