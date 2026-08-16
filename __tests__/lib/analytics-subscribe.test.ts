import { doc, onSnapshot } from 'firebase/firestore'
import { subscribeEventClicks, subscribeJobClicks } from '@/lib/firestore/analytics'
import { subscribeBlogReads } from '@/lib/firestore/blog'
import { subscribeBlogReactions } from '@/lib/firestore/blog-reactions'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  increment: (n: number) => n,
  serverTimestamp: () => ({ _method: 'serverTimestamp' }),
}))

jest.mock('@/lib/firebase-client', () => ({
  db: 'mock-db',
}))

const mockDoc = doc as jest.Mock
const mockOnSnapshot = onSnapshot as jest.Mock

type Snapshot = { data: () => Record<string, unknown> }
type NextHandler = (snap: Snapshot) => void

function captureHandlers() {
  const handlers: NextHandler[] = []
  const unsubs: jest.Mock[] = []
  mockOnSnapshot.mockImplementation((_ref: unknown, next: NextHandler) => {
    handlers.push(next)
    const unsub = jest.fn()
    unsubs.push(unsub)
    return unsub
  })
  return { handlers, unsubs }
}

function emit(handlers: NextHandler[], index: number, data: Record<string, unknown>) {
  handlers[index]({ data: () => data })
}

describe('live analytics subscribers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoc.mockReturnValue('mock-doc-ref')
  })

  it('subscribeBlogReads pushes counts as snapshots arrive', () => {
    const { handlers, unsubs } = captureHandlers()
    const cb = jest.fn()

    const unsub = subscribeBlogReads(['b1', 'b2'], cb)
    expect(mockDoc).toHaveBeenCalledWith('mock-db', 'analyticsBlogs', 'b1')
    expect(mockDoc).toHaveBeenCalledWith('mock-db', 'analyticsBlogs', 'b2')

    emit(handlers, 0, { reads: 5 })
    expect(cb).toHaveBeenLastCalledWith({ b1: 5 })

    emit(handlers, 1, { reads: 3 })
    expect(cb).toHaveBeenLastCalledWith({ b1: 5, b2: 3 })

    emit(handlers, 1, { reads: 8 })
    expect(cb).toHaveBeenLastCalledWith({ b1: 5, b2: 8 })

    unsub()
    expect(unsubs.every((u) => u.mock.calls.length === 1)).toBe(true)
  })

  it('subscribeEventClicks and subscribeJobClicks read the clicks field', () => {
    const { handlers } = captureHandlers()
    const cb = jest.fn()

    subscribeEventClicks(['e1'], cb)
    emit(handlers, 0, { clicks: 7 })
    expect(cb).toHaveBeenLastCalledWith({ e1: 7 })

    subscribeJobClicks(['j1'], cb)
    emit(handlers, 1, { clicks: 4 })
    expect(cb).toHaveBeenLastCalledWith({ j1: 4 })
  })

  it('subscribeBlogReactions reads likes/dislikes/shares', () => {
    const { handlers } = captureHandlers()
    const cb = jest.fn()

    subscribeBlogReactions(['p1'], cb)
    emit(handlers, 0, { likes: 2, dislikes: 1, shares: 0 })
    expect(cb).toHaveBeenLastCalledWith({ p1: { likes: 2, dislikes: 1, shares: 0 } })
  })

  it('subscribes with empty ids by emitting an empty map and returning a noop', () => {
    captureHandlers()
    const cb = jest.fn()
    const unsub = subscribeBlogReads([], cb)
    expect(cb).toHaveBeenCalledWith({})
    expect(typeof unsub).toBe('function')
    expect(mockOnSnapshot).not.toHaveBeenCalled()
  })

  it('keeps the last known count when a snapshot has no clicks field', () => {
    const { handlers } = captureHandlers()
    const cb = jest.fn()

    subscribeEventClicks(['e1'], cb)
    emit(handlers, 0, {})
    expect(cb).toHaveBeenLastCalledWith({ e1: 0 })
  })
})
