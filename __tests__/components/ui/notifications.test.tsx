import { render, screen, act } from '@testing-library/react'
import { NotificationsProvider, useNotify } from '@/components/ui/Notifications'

const TestConsumer = () => {
  const { notify } = useNotify()
  return <button onClick={() => notify({ message: 'Hello' })}>Notify</button>
}

describe('Notifications', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders children', () => {
    render(<NotificationsProvider><p>child</p></NotificationsProvider>)
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  it('shows notification when notify is called', () => {
    render(<NotificationsProvider><TestConsumer /></NotificationsProvider>)
    act(() => { screen.getByText('Notify').click() })
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('removes notification after timeout', () => {
    render(<NotificationsProvider><TestConsumer /></NotificationsProvider>)
    act(() => { screen.getByText('Notify').click() })
    expect(screen.getByText('Hello')).toBeInTheDocument()
    act(() => { jest.advanceTimersByTime(3000) })
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('throws when useNotify is used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useNotify must be used within NotificationsProvider')
  })
})
