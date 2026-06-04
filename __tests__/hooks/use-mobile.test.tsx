import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

function createMatchMedia(width: number) {
  const listeners: Array<() => void> = []
  const mql = {
    matches: width < 768,
    media: `(max-width: 767px)`,
    addEventListener: jest.fn((_event: string, handler: () => void) => {
      listeners.push(handler)
    }),
    removeEventListener: jest.fn(),
    _trigger: () => { listeners.forEach((fn) => fn()) },
  }
  return mql as unknown as MediaQueryList & { _trigger: () => void }
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth
  const matchMediaSpy = jest.spyOn(window, 'matchMedia')

  beforeEach(() => {
    matchMediaSpy.mockReset()
  })

  afterAll(() => {
    matchMediaSpy.mockRestore()
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true })
  })

  it('returns true when viewport is narrow (< 768px)', () => {
    const mql = createMatchMedia(375)
    matchMediaSpy.mockReturnValue(mql)
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when viewport is wide (>= 768px)', () => {
    const mql = createMatchMedia(1024)
    matchMediaSpy.mockReturnValue(mql)
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns false exactly at breakpoint (768px)', () => {
    const mql = createMatchMedia(768)
    matchMediaSpy.mockReturnValue(mql)
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when viewport changes from desktop to mobile', () => {
    const mql = createMatchMedia(1024)
    matchMediaSpy.mockReturnValue(mql)
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      mql._trigger()
    })

    expect(result.current).toBe(true)
  })

  it('adds and removes matchMedia listener', () => {
    const mql = createMatchMedia(1024)
    matchMediaSpy.mockReturnValue(mql)

    const { unmount } = renderHook(() => useIsMobile())
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
