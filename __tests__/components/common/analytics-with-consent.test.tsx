import { render, screen } from '@testing-library/react'
import { AnalyticsWithConsent } from '@/components/common/AnalyticsWithConsent'

jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="analytics">Analytics</div>,
}))

const mockUseCookieConsent = jest.fn()
jest.mock('@/contexts/CookieConsentContext', () => ({
  useCookieConsent: () => mockUseCookieConsent(),
}))

describe('AnalyticsWithConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when consent not loaded', () => {
    mockUseCookieConsent.mockReturnValue({ analytics: false, necessary: true, loaded: false })
    const { container } = render(<AnalyticsWithConsent />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when analytics consent is false', () => {
    mockUseCookieConsent.mockReturnValue({ analytics: false, necessary: true, loaded: true })
    const { container } = render(<AnalyticsWithConsent />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders Analytics when consent granted', () => {
    mockUseCookieConsent.mockReturnValue({ analytics: true, necessary: true, loaded: true })
    render(<AnalyticsWithConsent />)
    expect(screen.getByTestId('analytics')).toBeInTheDocument()
  })
})
