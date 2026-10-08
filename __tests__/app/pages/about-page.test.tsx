import { act, render, screen, within } from '@testing-library/react'
import AboutPage from '@/components/pages/AboutPage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

jest.mock('@/utils/seo', () => ({
  updatePageMeta: jest.fn(),
}))

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const renderWith = (state: typeof defaultAppState) => {
  mockUseApp.mockReturnValue({ state, dispatch: jest.fn() })
  return render(<AboutPage />)
}

describe('AboutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page heading and description', () => {
    renderWith(defaultAppState)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About us.')
    expect(screen.getByText(/We are a community of students/)).toBeInTheDocument()
  })

  it('calls updatePageMeta on mount', () => {
    const { updatePageMeta } = jest.requireMock('@/utils/seo')
    renderWith(defaultAppState)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'About Us',
      expect.stringContaining('mission'),
    )
  })

  it('renders mission and vision in the mission section', () => {
    renderWith(defaultAppState)
    const section = screen.getByRole('region', { name: /mission and vision/i })
    expect(within(section).getByText('Mission')).toBeInTheDocument()
    expect(within(section).getByText(/To democratize AI education/)).toBeInTheDocument()
    expect(within(section).getByText('Vision')).toBeInTheDocument()
    expect(within(section).getByText(/A student-led non-profit/)).toBeInTheDocument()
  })

  it('renders team section heading', () => {
    renderWith(defaultAppState)
    expect(screen.getByRole('heading', { name: /our team/i })).toBeInTheDocument()
  })

  it('places the history section between mission and team with sources and a join link', () => {
    renderWith(defaultAppState)
    const nav = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute('href', '#history')

    const regions = screen.getAllByRole('region')
    const sectionNames = regions.map((region) => region.getAttribute('aria-label'))
    expect(sectionNames.indexOf('Our mission and vision')).toBeLessThan(sectionNames.indexOf('History of UU AI Society'))
    expect(sectionNames.indexOf('History of UU AI Society')).toBeLessThan(sectionNames.indexOf('Meet our team'))

    const history = screen.getByRole('region', { name: 'History of UU AI Society' })
    expect(within(history).getByRole('heading', { name: /\(our\) history/i })).toBeInTheDocument()
    expect(within(history).getByRole('link', { name: /anders wall foundation/i })).toHaveAttribute('href', expect.stringContaining('wallstiftelsen.se'))
    expect(within(history).getAllByRole('link', { name: /uppsala university/i })[0]).toHaveAttribute('href', expect.stringContaining('uu.se'))
    expect(within(history).getByRole('link', { name: /join us/i })).toHaveAttribute('href', '/join')
  })

  it('links every section in the on-page nav', () => {
    renderWith(defaultAppState)
    const nav = screen.getByRole('navigation', { name: 'On this page' })
    for (const [label, href] of [
      ['Mission', '#mission'],
      ['History', '#history'],
      ['Team', '#team'],
      ['Contact', '#contact'],
      ['FAQ', '#faq'],
    ]) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href)
    }
  })

  it('keeps History active when another section leaves the observation band', () => {
    const originalObserver = globalThis.IntersectionObserver
    let onIntersection: IntersectionObserverCallback = () => {}
    globalThis.IntersectionObserver = jest.fn((callback) => {
      return {
        observe: jest.fn((element: Element) => {
          if (element.id === 'history') onIntersection = callback
        }),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }
    }) as unknown as typeof IntersectionObserver

    try {
      renderWith(defaultAppState)
      const mission = screen.getByRole('region', { name: 'Our mission and vision' })
      const history = screen.getByRole('region', { name: 'History of UU AI Society' })
      const emit = (entries: { target: Element; isIntersecting: boolean }[]) => {
        act(() => onIntersection(entries as IntersectionObserverEntry[], {} as IntersectionObserver))
      }
      emit([{ target: mission, isIntersecting: true }, { target: history, isIntersecting: true }])
      emit([{ target: mission, isIntersecting: false }])
      const nav = screen.getByRole('navigation', { name: 'On this page' })
      expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'location')
      expect(within(nav).getByRole('link', { name: 'Mission' })).not.toHaveAttribute('aria-current')
    } finally {
      globalThis.IntersectionObserver = originalObserver
    }
  })

  it('renders every contact address in the contact section', () => {
    renderWith(defaultAppState)
    const section = screen.getByRole('region', { name: /touch/i })
    for (const [label, email] of [
      ['General', 'contact@uuais.com'],
      ['Website', 'it@uuais.com'],
      ['Partnerships', 'partnerships@uuais.com'],
      ['Development', 'dev@uuais.com'],
      ['Research', 'research@uuais.com'],
    ]) {
      expect(within(section).getByText(label)).toBeInTheDocument()
      // The whole card is the mailto target, so the address sits inside the anchor.
      expect(within(section).getByText(email).closest('a')).toHaveAttribute('href', `mailto:${email}`)
    }
  })

  it('renders FAQ section heading even without FAQs', () => {
    renderWith(defaultAppState)
    expect(screen.getByRole('heading', { name: /asked questions/i })).toBeInTheDocument()
    expect(screen.getByText(/Questions aren't loading right now/)).toBeInTheDocument()
  })

  it('renders FAQ items sorted by order', () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        { id: '2', question: 'Second?', answer: 'Second answer.', category: 'general', order: 2, published: true },
        { id: '1', question: 'First?', answer: 'First answer.', category: 'general', order: 1, published: true },
        { id: '3', question: 'Third?', answer: 'Third answer.', category: 'general', order: 3, published: true },
      ],
    })
    const questions = screen.getAllByRole('term')
    expect(questions[0]).toHaveTextContent('First?')
    expect(questions[1]).toHaveTextContent('Second?')
    expect(questions[2]).toHaveTextContent('Third?')
  })

  it('filters out unpublished FAQs', () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        { id: '1', question: 'Published?', answer: 'Yes.', category: 'general', order: 1, published: true },
        { id: '2', question: 'Hidden?', answer: 'No.', category: 'general', order: 2, published: false },
      ],
    })
    expect(screen.getByText('Published?')).toBeInTheDocument()
    expect(screen.queryByText('Hidden?')).not.toBeInTheDocument()
  })

  it('converts email addresses in FAQ answers to mailto links', () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        { id: '1', question: 'Contact?', answer: 'Email us at hello@uuais.com for help.', category: 'general', order: 1, published: true },
      ],
    })
    const link = screen.getByText('hello@uuais.com')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', 'mailto:hello@uuais.com')
  })

  it('does not crash when FAQ answer has no email', () => {
    renderWith({
      ...defaultAppState,
      faqs: [
        { id: '1', question: 'General?', answer: 'Plain text answer.', category: 'general', order: 1, published: true },
      ],
    })
    expect(screen.getByText('Plain text answer.')).toBeInTheDocument()
  })
})
