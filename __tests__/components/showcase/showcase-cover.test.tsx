import { render, screen, fireEvent } from '@testing-library/react'
import ShowcaseCover from '@/components/showcase/ShowcaseCover'

describe('ShowcaseCover', () => {
  it('renders the uploaded cover when there is one', () => {
    render(<ShowcaseCover title="Course Navigator" image="/images/campus.png" />)
    expect(screen.getByAltText('Course Navigator project cover')).toBeInTheDocument()
  })

  it('falls back to initials when there is no cover', () => {
    render(<ShowcaseCover title="Course Navigator" />)
    expect(screen.getByText('CN')).toBeInTheDocument()
    // Decorative inside an already-labelled card link — it must not announce itself as an image.
    expect(screen.queryByRole('img', { name: /no cover image/i })).not.toBeInTheDocument()
  })

  // Storage objects outlive the records pointing at them; a dead URL leaks its alt text.
  it('falls back to initials when the cover fails to load', () => {
    render(<ShowcaseCover title="Broken Cover" image="https://example.com/gone.png" />)
    fireEvent.error(screen.getByAltText('Broken Cover project cover'))
    expect(screen.getByText('BC')).toBeInTheDocument()
  })

  // Indexing a string splits an emoji's surrogate pair into a replacement glyph.
  it.each([
    ['🚀 Rocket 🛰️ Lab', '🚀R'],
    ['乌普萨拉大学人工智能学会', '乌'],
    ['A', 'A'],
    ['Course Navigator', 'CN'],
  ])('builds initials from code points (%s)', (title, expected) => {
    render(<ShowcaseCover title={title} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('shows a dash when the title is empty', () => {
    render(<ShowcaseCover title="" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
