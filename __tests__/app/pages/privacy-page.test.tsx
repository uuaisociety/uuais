import { render, screen } from '@testing-library/react'
import { PrivacyPage } from '@/components/pages/PrivacyPage'

describe('PrivacyPage', () => {
  it('renders the page heading', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy Policy')
  })

  it('renders last updated date', () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it('renders all section headings', () => {
    render(<PrivacyPage />)
    expect(screen.getByText('Introduction')).toBeInTheDocument()
    expect(screen.getByText('Information We Collect')).toBeInTheDocument()
    expect(screen.getByText('How We Use Your Information')).toBeInTheDocument()
    expect(screen.getByText('Your Rights Under GDPR')).toBeInTheDocument()
    expect(screen.getByText('Data Retention')).toBeInTheDocument()
    expect(screen.getByText('Data Security')).toBeInTheDocument()
    expect(screen.getByText('Contact Us')).toBeInTheDocument()
    expect(screen.getByText('Policy Updates')).toBeInTheDocument()
  })

  it('renders contact emails', () => {
    render(<PrivacyPage />)
    expect(screen.getByText('dev@uuais.com')).toBeInTheDocument()
    expect(screen.getByText('contact@uuais.com')).toBeInTheDocument()
  })
})
