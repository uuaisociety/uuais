import { render, screen } from '@testing-library/react'
import ContactPage from '@/components/pages/ContactPage'

jest.mock('@/utils/seo', () => ({
  updatePageMeta: jest.fn(),
}))

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const defaultState = {
  events: [],
  teamMembers: [],
  blogPosts: [],
  faqs: [],
  jobs: [],
  boardPositions: [],
  applicants: [],
  registrationQuestions: [],
  isLoading: false,
  error: null,
}

describe('ContactPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page heading', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<ContactPage />)
    expect(screen.getByText('Contact Us')).toBeInTheDocument()
  })

  it('calls updatePageMeta on mount', () => {
    const { updatePageMeta } = jest.requireMock('@/utils/seo')
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<ContactPage />)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'Contact Us',
      'Get in touch with UU AI Society for questions, partnerships, or general inquiries',
    )
  })

  it('renders contact info cards', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<ContactPage />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Partnership')).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('contact@uuais.com')).toBeInTheDocument()
    expect(screen.getByText('partnerships@uuais.com')).toBeInTheDocument()
    expect(screen.getByText('dev@uuais.com')).toBeInTheDocument()
  })

  it('renders get in touch section', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<ContactPage />)
    expect(screen.getByText('Get in Touch')).toBeInTheDocument()
  })

  it('renders FAQ section heading even without FAQs', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<ContactPage />)
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()
  })

  it('renders FAQ items sorted by order', () => {
    const faqs = [
      { id: '2', question: 'Second?', answer: 'Second answer.', category: 'general', order: 2, published: true },
      { id: '1', question: 'First?', answer: 'First answer.', category: 'general', order: 1, published: true },
      { id: '3', question: 'Third?', answer: 'Third answer.', category: 'general', order: 3, published: true },
    ]
    mockUseApp.mockReturnValue({
      state: { ...defaultState, faqs },
      dispatch: jest.fn(),
    })
    render(<ContactPage />)
    const questions = screen.getAllByText(/\w+\?/).filter(t => t.textContent?.endsWith('?'))
    expect(questions[0]).toHaveTextContent('First?')
    expect(questions[1]).toHaveTextContent('Second?')
    expect(questions[2]).toHaveTextContent('Third?')
  })

  it('filters out unpublished FAQs', () => {
    const faqs = [
      { id: '1', question: 'Published?', answer: 'Yes.', category: 'general', order: 1, published: true },
      { id: '2', question: 'Hidden?', answer: 'No.', category: 'general', order: 2, published: false },
    ]
    mockUseApp.mockReturnValue({
      state: { ...defaultState, faqs },
      dispatch: jest.fn(),
    })
    render(<ContactPage />)
    expect(screen.getByText('Published?')).toBeInTheDocument()
    expect(screen.queryByText('Hidden?')).not.toBeInTheDocument()
  })

  it('converts email addresses in FAQ answers to mailto links', () => {
    const faqs = [
      { id: '1', question: 'Contact?', answer: 'Email us at hello@uuais.com for help.', category: 'general', order: 1, published: true },
    ]
    mockUseApp.mockReturnValue({
      state: { ...defaultState, faqs },
      dispatch: jest.fn(),
    })
    render(<ContactPage />)
    const link = screen.getByText('hello@uuais.com')
    expect(link).toBeInTheDocument()
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', 'mailto:hello@uuais.com')
  })

  it('does not crash when FAQ answer has no email', () => {
    const faqs = [
      { id: '1', question: 'General?', answer: 'Plain text answer.', category: 'general', order: 1, published: true },
    ]
    mockUseApp.mockReturnValue({
      state: { ...defaultState, faqs },
      dispatch: jest.fn(),
    })
    render(<ContactPage />)
    expect(screen.getByText('Plain text answer.')).toBeInTheDocument()
  })
})
