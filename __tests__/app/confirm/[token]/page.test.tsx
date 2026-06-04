import { render, screen } from '@testing-library/react'
import ConfirmPage from '@/app/confirm/[token]/page'
import { confirmRegistrationByToken } from '@/lib/firestore/registrations'

jest.mock('@/lib/firestore/registrations', () => ({
  confirmRegistrationByToken: jest.fn(),
}))

const g = global as {
  __setMockParams?: (params: Record<string, string>) => void
}

describe('ConfirmPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    g.__setMockParams?.({ token: 'valid-token' })
  })

  it('shows processing state while confirming', () => {
    (confirmRegistrationByToken as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<ConfirmPage />)
    expect(screen.getByText('Processing your confirmation...')).toBeInTheDocument()
  })

  it('shows success message and action links when confirmed', async () => {
    (confirmRegistrationByToken as jest.Mock).mockResolvedValue({
      ok: true,
      message: 'Registration confirmed',
    })
    render(<ConfirmPage />)
    expect(await screen.findByText('Registration confirmed')).toBeInTheDocument()
    expect(screen.getByText('Browse Events')).toBeInTheDocument()
    expect(screen.getByText('Go to Account')).toBeInTheDocument()
  })

  it('shows error message when token is invalid or expired', async () => {
    (confirmRegistrationByToken as jest.Mock).mockResolvedValue({
      ok: false,
      message: 'Token not found or already used',
    })
    render(<ConfirmPage />)
    expect(await screen.findByText('Token not found or already used')).toBeInTheDocument()
  })

  it('shows error message when confirmRegistrationByToken throws', async () => {
    (confirmRegistrationByToken as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    )
    render(<ConfirmPage />)
    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('uses fallback error message when thrown value is not an Error', async () => {
    (confirmRegistrationByToken as jest.Mock).mockRejectedValue('string error')
    render(<ConfirmPage />)
    expect(await screen.findByText('An error occurred')).toBeInTheDocument()
  })

  it('calls confirmRegistrationByToken with the token from params', async () => {
    (confirmRegistrationByToken as jest.Mock).mockResolvedValue({
      ok: true,
      message: 'Confirmed',
    })
    render(<ConfirmPage />)
    await screen.findByText('Confirmed')
    expect(confirmRegistrationByToken).toHaveBeenCalledWith('valid-token')
  })
})
