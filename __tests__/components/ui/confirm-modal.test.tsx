import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    open: true,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  }

  it('renders nothing when closed', () => {
    const { container } = render(<ConfirmModal {...defaultProps} open={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when open', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders default title and description', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Confirm')
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        title="Delete event?"
        description="This cannot be undone."
      />
    )
    expect(screen.getByText('Delete event?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('renders confirm and cancel buttons with custom text', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmText="Yes, delete"
        cancelText="Keep it"
      />
    )
    expect(screen.getByText('Yes, delete')).toBeInTheDocument()
    expect(screen.getByText('Keep it')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = jest.fn()
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />)
    await userEvent.click(screen.getAllByText('Confirm')[1])
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button clicked', async () => {
    const onClose = jest.fn()
    render(<ConfirmModal {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has aria-modal attribute', () => {
    render(<ConfirmModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })
})
