import { normalizeContentHtml } from '@/lib/ai/blog/html'

describe('normalizeContentHtml', () => {
  it('adds a line break before an h2 that follows a paragraph', () => {
    expect(normalizeContentHtml('<p>Hello</p><h2>World</h2>')).toBe('<p>Hello</p>\n<h2>World</h2>')
  })

  it('adds a line break after a closing h2 before a paragraph', () => {
    expect(normalizeContentHtml('<h2>World</h2><p>Body</p>')).toBe('\n<h2>World</h2>\n<p>Body</p>')
  })

  it('handles h3 headings the same way', () => {
    expect(normalizeContentHtml('<p>Intro</p><h3>Section</h3><p>More</p>')).toBe(
      '<p>Intro</p>\n<h3>Section</h3>\n<p>More</p>'
    )
  })

  it('leaves headings that already have a line break untouched', () => {
    expect(normalizeContentHtml('<p>x</p>\n<h2>Y</h2>')).toBe('<p>x</p>\n<h2>Y</h2>')
  })

  it('normalizes a heading at the start of the content', () => {
    expect(normalizeContentHtml('<h2>A</h2>')).toBe('\n<h2>A</h2>')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeContentHtml('  <p>x</p><h2>Y</h2>  ')).toBe('<p>x</p>\n<h2>Y</h2>')
  })

  it('keeps a blank line between consecutive headings readable', () => {
    expect(normalizeContentHtml('<h2>A</h2><h3>B</h3>')).toBe('\n<h2>A</h2>\n<h3>B</h3>')
  })
})
