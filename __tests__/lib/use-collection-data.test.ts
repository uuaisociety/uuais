import { renderHook, act, waitFor } from '@testing-library/react'

// jest.setup.ts mocks this module globally for component tests; unmock it here
// so this unit test exercises the real hook.
jest.unmock('@/lib/firestore/useCollectionData')

import { useCollectionData } from '@/lib/firestore/useCollectionData'

describe('useCollectionData', () => {
  it('returns data and loaded from the subscription', async () => {
    const subscribe = jest.fn((cb: (items: number[]) => void) => {
      cb([1, 2, 3])
      return jest.fn()
    })

    const { result } = renderHook(() => useCollectionData(subscribe, []))
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.data).toEqual([1, 2, 3])
  })

  it('treats a throwing subscribe as empty-but-loaded (no crash)', async () => {
    const subscribe = jest.fn(() => {
      throw new Error('INTERNAL ASSERTION FAILED')
    })

    const { result } = renderHook(() => useCollectionData(subscribe, []))
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('swallows a throwing unsubscribe on unmount', () => {
    const subscribe = jest.fn(() => () => {
      throw new Error('INTERNAL ASSERTION FAILED')
    })

    expect(() => {
      const { unmount } = renderHook(() => useCollectionData(subscribe, []))
      act(() => unmount())
    }).not.toThrow()
  })

  it('ignores late subscription updates after unmount', () => {
    let emit: (items: number[]) => void = () => {}
    const subscribe = jest.fn((cb: (items: number[]) => void) => {
      emit = cb
      return jest.fn()
    })

    const { unmount } = renderHook(() => useCollectionData(subscribe, []))
    unmount()
    expect(() => act(() => emit([9]))).not.toThrow()
  })
})
