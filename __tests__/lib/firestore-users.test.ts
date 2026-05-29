import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}))

jest.mock('@/lib/firebase-client', () => ({
  db: 'mock-db',
}))

const mockCollection = collection as jest.Mock
const mockDoc = doc as jest.Mock
const mockGetDocs = getDocs as jest.Mock
const mockGetDoc = getDoc as jest.Mock
const mockSetDoc = setDoc as jest.Mock
const mockUpdateDoc = updateDoc as jest.Mock
const mockDeleteDoc = deleteDoc as jest.Mock

describe('users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoc.mockReturnValue('mock-ref')
    mockCollection.mockReturnValue('mock-collection')
  })

  describe('listUsers', () => {
    it('returns all users from collection', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'u1', data: () => ({ displayName: 'Alice', email: 'a@b.com' }) },
          { id: 'u2', data: () => ({ displayName: 'Bob', email: 'b@c.com' }) },
        ],
      })
      const { listUsers } = await import('@/lib/firestore/users')
      const result = await listUsers()
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('u1')
      expect(result[0].displayName).toBe('Alice')
      expect(mockCollection).toHaveBeenCalledWith('mock-db', 'users')
    })
  })

  describe('deleteUser', () => {
    it('deletes user document', async () => {
      const { deleteUser } = await import('@/lib/firestore/users')
      await deleteUser('uid123')
      expect(mockDoc).toHaveBeenCalledWith('mock-db', 'users', 'uid123')
      expect(mockDeleteDoc).toHaveBeenCalledWith('mock-ref')
    })
  })

  describe('getUserProfile', () => {
    it('returns user profile when document exists', async () => {
      mockGetDoc.mockResolvedValue({ id: 'u1', exists: () => true, data: () => ({ displayName: 'Alice' }) })
      const { getUserProfile } = await import('@/lib/firestore/users')
      const result = await getUserProfile('u1')
      expect(result).toEqual({ id: 'u1', displayName: 'Alice' })
    })

    it('returns null when document does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })
      const { getUserProfile } = await import('@/lib/firestore/users')
      const result = await getUserProfile('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('upsertUserProfile', () => {
    it('sets document with merged data', async () => {
      const { upsertUserProfile } = await import('@/lib/firestore/users')
      await upsertUserProfile('u1', { displayName: 'Alice', email: 'a@b.com' })
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-ref',
        expect.objectContaining({
          displayName: 'Alice',
          email: 'a@b.com',
          updatedAt: expect.any(String),
        }),
        { merge: true }
      )
    })

    it('strips undefined values', async () => {
      const { upsertUserProfile } = await import('@/lib/firestore/users')
      await upsertUserProfile('u1', { displayName: 'Alice', name: undefined })
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-ref',
        expect.not.objectContaining({ name: undefined }),
        { merge: true }
      )
    })
  })

  describe('updateUserProfile', () => {
    it('updates document with patch data', async () => {
      const { updateUserProfile } = await import('@/lib/firestore/users')
      await updateUserProfile('u1', { displayName: 'Updated' })
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-ref',
        expect.objectContaining({
          displayName: 'Updated',
          updatedAt: expect.any(String),
        })
      )
    })
  })

  describe('setUserUnsubscribed', () => {
    it('calls updateUserProfile with unsubscribed flag', async () => {
      const { setUserUnsubscribed } = await import('@/lib/firestore/users')
      await setUserUnsubscribed('u1', true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-ref',
        expect.objectContaining({ unsubscribedFromEmails: true })
      )
    })
  })
})
