import { stripUndefined, ensureString, ensureNumber, ensureTimestampIso } from '@/lib/firestore/utils'

describe('stripUndefined', () => {
  it('leaves primitives unchanged', () => {
    expect(stripUndefined('hello')).toBe('hello')
    expect(stripUndefined(42)).toBe(42)
    expect(stripUndefined(null)).toBeNull()
    expect(stripUndefined(undefined)).toBeUndefined()
  })

  it('removes undefined values from objects', () => {
    expect(stripUndefined({ a: 1, b: undefined, c: 'x' })).toEqual({ a: 1, c: 'x' })
  })

  it('removes undefined values from arrays', () => {
    expect(stripUndefined([1, undefined, 2])).toEqual([1, 2])
  })

  it('handles nested objects', () => {
    const input = { a: { b: undefined, c: 1 }, d: undefined }
    expect(stripUndefined(input)).toEqual({ a: { c: 1 } })
  })
})

describe('ensureString', () => {
  it('returns the string value', () => {
    expect(ensureString('hello')).toBe('hello')
  })

  it('returns empty string for non-strings', () => {
    expect(ensureString(undefined)).toBe('')
    expect(ensureString(42)).toBe('')
    expect(ensureString(null)).toBe('')
  })
})

describe('ensureNumber', () => {
  it('returns the number value', () => {
    expect(ensureNumber(42)).toBe(42)
    expect(ensureNumber(0)).toBe(0)
  })

  it('returns fallback for non-numbers', () => {
    expect(ensureNumber(undefined)).toBe(0)
    expect(ensureNumber('foo')).toBe(0)
    expect(ensureNumber(NaN)).toBe(0)
  })

  it('uses custom fallback', () => {
    expect(ensureNumber(undefined, -1)).toBe(-1)
  })
})

describe('ensureTimestampIso', () => {
  it('returns empty string for falsy input', () => {
    expect(ensureTimestampIso(null)).toBe('')
    expect(ensureTimestampIso(undefined)).toBe('')
  })

  it('returns string unchanged', () => {
    expect(ensureTimestampIso('2024-01-01')).toBe('2024-01-01')
  })

  it('converts Date to ISO string', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    expect(ensureTimestampIso(date)).toBe('2024-01-01T00:00:00.000Z')
  })

  it('converts Firestore Timestamp via toDate()', () => {
    const ts = { toDate: () => new Date('2024-06-15T12:00:00Z') }
    expect(ensureTimestampIso(ts)).toBe('2024-06-15T12:00:00.000Z')
  })

  it('returns empty string for non-timestamp objects without toDate', () => {
    expect(ensureTimestampIso({})).toBe('')
  })
})
