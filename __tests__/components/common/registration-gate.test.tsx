import { render } from '@testing-library/react'
import RegistrationGate from '@/components/auth/RegistrationGate'

const mockPush = jest.fn()
const unsubscribe = jest.fn()

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn(() => unsubscribe),
  },
}))

jest.mock('@/lib/firestore', () => ({
  getUserProfile: jest.fn(),
}))

describe('RegistrationGate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.__mockPathname = '/'
  })

  it('renders nothing', () => {
    const { container } = render(<RegistrationGate />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not redirect on public paths', () => {
    jest.requireMock('@/lib/firebase-client').auth.onAuthStateChanged
      .mockImplementation((cb: (u: unknown) => void) => {
        cb({ uid: '123' })
        return unsubscribe
      })
    global.__mockPathname = '/'
    render(<RegistrationGate />)
    expect(mockPush).not.toHaveBeenCalled()
  })
})
