import { findPublishedShowcaseProject, getPublishedShowcaseProjects } from '@/lib/showcase-server'
import { ensureUniqueShowcaseSlug } from '@/lib/firestore/showcase'

const mockGet = jest.fn()
const mockLimit = jest.fn(() => ({ get: mockGet }))
const mockWhere = jest.fn(() => ({ limit: mockLimit, get: mockGet }))
const mockDocGet = jest.fn()
const mockDoc = jest.fn((id: string) => ({ id, get: mockDocGet }))
const mockCollection = jest.fn(() => ({ where: mockWhere, doc: mockDoc }))

jest.mock('@/lib/firebase-admin', () => ({
  // Lazily forwarded: the factory runs at import time, before the consts below are initialized.
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args) },
}))

const mockGetDocs = jest.fn()
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'collection'),
  query: jest.fn((ref: unknown, ...conds: unknown[]) => ({ ref, conds })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}))

jest.mock('@/lib/firebase-client', () => ({ db: {} }))

function slugSnapshot(docs: { id: string; data: Record<string, unknown> }[]) {
  return { empty: docs.length === 0, docs: docs.map((d) => ({ id: d.id, data: () => d.data })) }
}

function idSnapshot(data: Record<string, unknown> | null, id = 'doc-id') {
  return { exists: data !== null, id, data: () => data }
}

describe('findPublishedShowcaseProject', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockResolvedValue(slugSnapshot([]))
    mockDocGet.mockResolvedValue(idSnapshot(null))
  })

  it('returns the published project found by slug, with the doc id attached', async () => {
    mockGet.mockResolvedValue(slugSnapshot([{ id: 's1', data: { title: 'Course Navigator', published: true } }]))
    await expect(findPublishedShowcaseProject('course-navigator')).resolves.toEqual(
      expect.objectContaining({ id: 's1', title: 'Course Navigator' }),
    )
    expect(mockWhere).toHaveBeenCalledWith('slug', '==', 'course-navigator')
    expect(mockLimit).toHaveBeenCalledWith(1)
  })

  it('falls back to the id lookup when the slug misses', async () => {
    mockDocGet.mockResolvedValue(idSnapshot({ title: 'Hidden Gem', published: true }, 'abc123'))
    await expect(findPublishedShowcaseProject('abc123')).resolves.toEqual(
      expect.objectContaining({ id: 'abc123', title: 'Hidden Gem' }),
    )
    expect(mockDoc).toHaveBeenCalledWith('abc123')
  })

  it('skips an unpublished slug match and still tries the id lookup', async () => {
    mockGet.mockResolvedValue(slugSnapshot([{ id: 's1', data: { title: 'Draft', published: false } }]))
    mockDocGet.mockResolvedValue(idSnapshot({ title: 'Draft', published: true }, 'draft'))
    await expect(findPublishedShowcaseProject('draft')).resolves.toEqual(
      expect.objectContaining({ id: 'draft', title: 'Draft' }),
    )
  })

  it('returns null when an unpublished slug match has no published id fallback', async () => {
    mockGet.mockResolvedValue(slugSnapshot([{ id: 's1', data: { title: 'Draft', published: false } }]))
    await expect(findPublishedShowcaseProject('draft')).resolves.toBeNull()
  })

  it('returns null when neither lookup finds a published project', async () => {
    await expect(findPublishedShowcaseProject('nope')).resolves.toBeNull()
    expect(mockWhere).toHaveBeenCalledWith('slug', '==', 'nope')
    expect(mockDoc).toHaveBeenCalledWith('nope')
  })

  it('returns null when the query throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGet.mockRejectedValue(new Error('permission-denied'))
    await expect(findPublishedShowcaseProject('nope')).resolves.toBeNull()
    warn.mockRestore()
  })
})

describe('getPublishedShowcaseProjects', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns published projects, newest first', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'a', data: () => ({ title: 'Older', published: true, createdAt: '2026-01-01T00:00:00Z' }) },
        { id: 'b', data: () => ({ title: 'Newer', published: true, createdAt: '2026-02-01T00:00:00Z' }) },
      ],
    })
    const projects = await getPublishedShowcaseProjects()
    expect(projects.map((p) => p.title)).toEqual(['Newer', 'Older'])
    expect(mockWhere).toHaveBeenCalledWith('published', '==', true)
  })

  it('returns an empty list when the query throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGet.mockRejectedValue(new Error('offline'))
    await expect(getPublishedShowcaseProjects()).resolves.toEqual([])
    warn.mockRestore()
  })
})

describe('ensureUniqueShowcaseSlug', () => {
  beforeEach(() => jest.clearAllMocks())

  /** Answer each successive slug query with the ids that already hold that slug. */
  function slugHolders(...rounds: string[][]) {
    for (const ids of rounds) {
      mockGetDocs.mockResolvedValueOnce({ docs: ids.map((id) => ({ id, data: () => ({}) })) })
    }
  }

  it('appends -2, -3 until it finds a free slug', async () => {
    slugHolders(['other-1'], ['other-2'], [])
    await expect(ensureUniqueShowcaseSlug('course-navigator')).resolves.toBe('course-navigator-3')
  })

  it('ignores the project itself when checking for clashes', async () => {
    slugHolders(['s1'])
    await expect(ensureUniqueShowcaseSlug('course-navigator', 's1')).resolves.toBe('course-navigator')
  })

  it('falls back to the record id after 99 occupied candidates', async () => {
    mockGetDocs.mockResolvedValue({ docs: [{ id: 'other', data: () => ({}) }] })
    await expect(ensureUniqueShowcaseSlug('course-navigator', 's1')).resolves.toBe('course-navigator-s1')
  })
})