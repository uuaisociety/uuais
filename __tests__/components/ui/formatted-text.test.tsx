import { render, screen } from '@testing-library/react'
import FormattedText from '@/components/ui/FormattedText'

describe('FormattedText', () => {
  it('renders blank-line separated paragraphs', () => {
    render(<FormattedText text={'First paragraph.\n\nSecond paragraph.'} />)
    const paragraphs = screen.getAllByText(/paragraph\./)
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].tagName).toBe('P')
    expect(paragraphs[1].tagName).toBe('P')
  })

  it('preserves blank lines as vertical space instead of stripping them', () => {
    const { container } = render(<FormattedText text={'Para one.\n\n\nPara two.'} />)
    expect(container.querySelectorAll('div[aria-hidden="true"]')).toHaveLength(2)
  })

  it('renders dash bullet lists', () => {
    render(<FormattedText text={'- Run monthly workshops\n- Maintain the website'} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Run monthly workshops')
    expect(items[1]).toHaveTextContent('Maintain the website')
  })

  it('renders headings from # markers', () => {
    render(<FormattedText text={'# What you will do\n\n## Requirements'} />)
    expect(screen.getByRole('heading', { name: 'What you will do' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Requirements' })).toBeInTheDocument()
  })

  it('auto-links http(s) URLs', () => {
    render(<FormattedText text={'Visit https://example.com/path for details.'} />)
    const link = screen.getByRole('link', { name: 'https://example.com/path' })
    expect(link).toHaveAttribute('href', 'https://example.com/path')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('auto-links email addresses to mailto:', () => {
    render(<FormattedText text={'Contact board@uuais.com anytime.'} />)
    const link = screen.getByRole('link', { name: 'board@uuais.com' })
    expect(link).toHaveAttribute('href', 'mailto:board@uuais.com')
  })

  it('renders markdown-style [text](url) links', () => {
    render(<FormattedText text={'Read [our handbook](https://uuais.com/handbook).'} />)
    const link = screen.getByRole('link', { name: 'our handbook' })
    expect(link).toHaveAttribute('href', 'https://uuais.com/handbook')
  })

  it('does not link javascript: URLs', () => {
    render(<FormattedText text={'Click [here](javascript:alert(1)).'} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/here/)).toBeInTheDocument()
  })

  it('preserves soft line breaks inside a paragraph', () => {
    render(<FormattedText text={'Line one\nLine two'} />)
    const p = screen.getByText(/Line one/)
    expect(p).toHaveClass('whitespace-pre-line')
  })
})
