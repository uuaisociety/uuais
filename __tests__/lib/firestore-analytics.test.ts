import { doc, getDoc, setDoc } from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  increment: (n: number) => n,
  serverTimestamp: () => ({ _method: 'serverTimestamp' }),
}))

jest.mock('@/lib/firebase-client', () => ({
  db: 'mock-db',
}))

const mockDoc = doc as jest.Mock
const mockGetDoc = getDoc as jest.Mock
const mockSetDoc = setDoc as jest.Mock

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoc.mockReturnValue('mock-doc-ref')
    localStorage.clear()
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  })

  describe('incrementEventUniqueClick', () => {
    it('counts clicks without analytics consent', async () => {
      const { incrementEventUniqueClick } = await import('@/lib/firestore/analytics')
      await incrementEventUniqueClick('event1')
      expect(localStorage.getItem('clicked_event_event1')).toBe('1')
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', { clicks: 1, updatedAt: { _method: 'serverTimestamp' } }, { merge: true })
    })

    it('sets localStorage key and increments firestore', async () => {
      const { incrementEventUniqueClick } = await import('@/lib/firestore/analytics')
      await incrementEventUniqueClick('event1')
      expect(localStorage.getItem('clicked_event_event1')).toBe('1')
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', { clicks: 1, updatedAt: { _method: 'serverTimestamp' } }, { merge: true })
    })

    it('does not increment twice for same event', async () => {
      localStorage.setItem('clicked_event_event1', '1')
      const { incrementEventUniqueClick } = await import('@/lib/firestore/analytics')
      await incrementEventUniqueClick('event1')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('does nothing when localStorage throws (sandboxed context)', async () => {
      const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('sandbox') })
      const { incrementEventUniqueClick } = await import('@/lib/firestore/analytics')
      await incrementEventUniqueClick('event1')
      expect(mockSetDoc).not.toHaveBeenCalled()
      getItem.mockRestore()
    })
  })

  describe('getEventClicksCounts', () => {
    it('returns click counts for given IDs', async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ clicks: 5 }) })
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ clicks: 3 }) })
      const { getEventClicksCounts } = await import('@/lib/firestore/analytics')
      const result = await getEventClicksCounts(['e1', 'e2'])
      expect(result).toEqual({ e1: 5, e2: 3 })
    })

    it('returns 0 for non-existent documents', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })
      const { getEventClicksCounts } = await import('@/lib/firestore/analytics')
      const result = await getEventClicksCounts(['missing'])
      expect(result).toEqual({ missing: 0 })
    })
  })

  describe('incrementJobClick', () => {
    it('increments job click', async () => {
      const { incrementJobClick } = await import('@/lib/firestore/analytics')
      await incrementJobClick('job1')
      expect(localStorage.getItem('clicked_job_job1')).toBe('1')
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', expect.any(Object), { merge: true })
    })

    it('still counts when no consent cookie is present', async () => {
      const { incrementJobClick } = await import('@/lib/firestore/analytics')
      await incrementJobClick('job1')
      expect(mockSetDoc).toHaveBeenCalled()
    })
  })

  describe('getJobClicksCounts', () => {
    it('returns job click counts', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ clicks: 7 }) })
      const { getJobClicksCounts } = await import('@/lib/firestore/analytics')
      const result = await getJobClicksCounts(['j1'])
      expect(result).toEqual({ j1: 7 })
    })
  })

  describe('incrementExternalRegistrationClick', () => {
    it('increments external registration click', async () => {
      const { incrementExternalRegistrationClick } = await import('@/lib/firestore/analytics')
      await incrementExternalRegistrationClick('event1')
      expect(localStorage.getItem('external_reg_event1')).toBe('1')
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({ externalRegistrationClicks: 1 }), { merge: true })
    })
  })

  describe('incrementBlogRead', () => {
    it('increments blog read count', async () => {
      const { incrementBlogRead } = await import('@/lib/firestore/analytics')
      await incrementBlogRead('blog1')
      expect(localStorage.getItem('read_blog_blog1')).toBe('1')
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({ reads: 1 }), { merge: true })
    })

    it('still counts when no consent cookie is present', async () => {
      const { incrementBlogRead } = await import('@/lib/firestore/analytics')
      await incrementBlogRead('blog1')
      expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({ reads: 1 }), { merge: true })
    })
  })
})
