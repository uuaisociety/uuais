jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'collection'),
  query: jest.fn((ref: unknown, ...conds: unknown[]) => ({ ref, conds })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  orderBy: jest.fn((field: string, dir: string) => ({ field, dir })),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  addDoc: jest.fn().mockResolvedValue({ id: 'new-id' }),
  doc: jest.fn(() => ({ id: 's1' })),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  onSnapshot: jest.fn((_qy: unknown, cb: (s: unknown) => void) => {
    cb({ docs: [], metadata: { fromCache: false } })
    return () => {}
  }),
}))

jest.mock('@/lib/firebase-client', () => ({ db: {} }))

jest.mock('@/lib/firestore/utils', () => ({
  stripUndefined: (x: unknown) => JSON.parse(JSON.stringify(x)),
}))

const mockGetUserProfile = jest.fn()
jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: (uid: string) => mockGetUserProfile(uid),
}))

const mockSendTemplatedEmail = jest.fn().mockResolvedValue('mail-1')
jest.mock('@/lib/email', () => ({
  sendTemplatedEmail: (input: unknown) => mockSendTemplatedEmail(input),
}))

import * as firestore from 'firebase/firestore'
import {
  addShowcaseProject,
  updateShowcaseProject,
  deleteShowcaseProject,
  subscribeToShowcaseProjects,
  subscribeToMyShowcaseProjects,
  notifyShowcaseApproved,
  ensureUniqueShowcaseSlug,
} from '@/lib/firestore/showcase'

const projectDoc = { title: 'Course Navigator', published: true, createdAt: '2026-01-01' }

function snapshotWith(docs: { id: string; data: unknown }[], fromCache = false) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })), metadata: { fromCache } }
}

describe('showcase firestore helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(firestore.getDocs as jest.Mock).mockResolvedValue(snapshotWith([{ id: 's1', data: projectDoc }]))
    ;(firestore.onSnapshot as jest.Mock).mockImplementation((_qy: unknown, cb: (s: unknown) => void) => {
      cb(snapshotWith([{ id: 's1', data: projectDoc }]))
      return () => {}
    })
  })

  it('addShowcaseProject returns the new id', async () => {
    const id = await addShowcaseProject({ title: 'X' } as never)
    expect(id).toBe('new-id')
  })

  // Admin edits pass the full project (id included); the id is the document key, not a field.
  it('updateShowcaseProject updates the doc and strips the id from the patch', async () => {
    await updateShowcaseProject('s1', { id: 's1', title: 'Y' } as never)
    expect(firestore.updateDoc).toHaveBeenCalledWith({ id: 's1' }, { title: 'Y' })
  })

  it('deleteShowcaseProject deletes the doc', async () => {
    await expect(deleteShowcaseProject('s1')).resolves.toBeUndefined()
  })

  it('subscribeToShowcaseProjects streams projects and returns unsubscribe', () => {
    const cb = jest.fn()
    const unsub = subscribeToShowcaseProjects(cb)
    expect(cb).toHaveBeenCalledWith([{ ...projectDoc, id: 's1' }], { fromCache: false })
    expect(unsub).toBeInstanceOf(Function)
  })
})

describe('subscribeToMyShowcaseProjects', () => {
  beforeEach(() => jest.clearAllMocks())

  it("streams a member's own submissions, filtered by creatorUserId", () => {
    ;(firestore.onSnapshot as jest.Mock).mockImplementation((_qy: unknown, cb: (s: unknown) => void) => {
      cb(snapshotWith([{ id: 's1', data: projectDoc }]))
      return () => {}
    })
    const cb = jest.fn()
    subscribeToMyShowcaseProjects('u1', cb)
    expect(firestore.where).toHaveBeenCalledWith('creatorUserId', '==', 'u1')
    expect(cb).toHaveBeenCalledWith([{ ...projectDoc, id: 's1' }])
  })

  // A dropped stream is otherwise silent — the member would never see their own review queue update.
  it('surfaces a stream error to the caller', () => {
    const err = new Error('permission-denied')
    ;(firestore.onSnapshot as jest.Mock).mockImplementationOnce((_qy, _cb, onError) => {
      onError(err)
      return () => {}
    })
    const onError = jest.fn()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    subscribeToMyShowcaseProjects('u1', jest.fn(), onError)
    expect(onError).toHaveBeenCalledWith(err)
    warn.mockRestore()
  })
})

// An empty cached result means "could not ask", not "nothing there".
describe('subscribeToShowcaseProjects failure signalling', () => {
  const onSnapshot = firestore.onSnapshot as unknown as jest.Mock

  beforeEach(() => jest.clearAllMocks())

  it('reports whether the snapshot reached the server', () => {
    onSnapshot.mockImplementationOnce((_qy, cb) => {
      cb({ docs: [], metadata: { fromCache: true } })
      return () => {}
    })
    const cb = jest.fn()
    subscribeToShowcaseProjects(cb)
    expect(cb).toHaveBeenCalledWith([], { fromCache: true })
  })

  it('marks a server-answered snapshot as not from cache', () => {
    onSnapshot.mockImplementationOnce((_qy, cb) => {
      cb({ docs: [{ id: 's1', data: () => projectDoc }], metadata: { fromCache: false } })
      return () => {}
    })
    const cb = jest.fn()
    subscribeToShowcaseProjects(cb)
    expect(cb).toHaveBeenCalledWith([{ ...projectDoc, id: 's1' }], { fromCache: false })
  })

  // A dropped stream is otherwise silent — the last snapshot just stops updating.
  it('surfaces a stream error to the caller', () => {
    const err = new Error('permission-denied')
    onSnapshot.mockImplementationOnce((_qy, _cb, onError) => {
      onError(err)
      return () => {}
    })
    const onError = jest.fn()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    subscribeToShowcaseProjects(jest.fn(), { onError })
    expect(onError).toHaveBeenCalledWith(err)
    warn.mockRestore()
  })
})

// Two projects sharing a slug leaves one unreachable: the lookup takes the first match.
describe('ensureUniqueShowcaseSlug', () => {
  const getDocs = firestore.getDocs as jest.Mock

  beforeEach(() => jest.clearAllMocks())

  /** Answer each successive slug query with the ids that already hold that slug. */
  function slugHolders(...rounds: string[][]) {
    for (const ids of rounds) {
      getDocs.mockResolvedValueOnce({ docs: ids.map((id) => ({ id, data: () => ({}) })) })
    }
  }

  it('keeps the base slug when nothing holds it', async () => {
    slugHolders([])
    await expect(ensureUniqueShowcaseSlug('course-navigator')).resolves.toBe('course-navigator')
  })

  it('appends a counter until it finds a free slug', async () => {
    slugHolders(['other-1'], ['other-2'], [])
    await expect(ensureUniqueShowcaseSlug('course-navigator')).resolves.toBe('course-navigator-3')
  })

  it('ignores the project itself, so re-saving does not bump its own slug', async () => {
    slugHolders(['s1'])
    await expect(ensureUniqueShowcaseSlug('course-navigator', 's1')).resolves.toBe('course-navigator')
  })

  it('queries the slug it is testing', async () => {
    slugHolders(['other-1'], [])
    await ensureUniqueShowcaseSlug('course-navigator')
    expect(firestore.where).toHaveBeenCalledWith('slug', '==', 'course-navigator')
    expect(firestore.where).toHaveBeenCalledWith('slug', '==', 'course-navigator-2')
  })
})

// Approval used to be silent: the board saw the queue, the member never heard back.
describe('notifyShowcaseApproved', () => {
  const project = {
    id: 's1',
    slug: 'course-navigator',
    title: 'Course Navigator',
    creatorUserId: 'u1',
    creatorName: 'Ada',
  } as never

  beforeEach(() => {
    jest.clearAllMocks()
    mockSendTemplatedEmail.mockResolvedValue('mail-1')
  })

  it('emails the builder a link to the live project', async () => {
    mockGetUserProfile.mockResolvedValue({ id: 'u1', email: 'ada@example.com', displayName: 'Ada' })
    await notifyShowcaseApproved(project, 'https://uuais.com')
    expect(mockSendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        subject: 'Course Navigator is live on the showcase',
        templatePath: '/email-templates/showcaseApproved.html',
        variables: expect.objectContaining({
          name: 'Ada',
          project_title: 'Course Navigator',
          project_url: 'https://uuais.com/showcase/course-navigator',
        }),
      }),
    )
  })

  it('falls back to the record id when the project has no slug', async () => {
    mockGetUserProfile.mockResolvedValue({ id: 'u1', email: 'ada@example.com' })
    await notifyShowcaseApproved({ ...(project as object), slug: undefined } as never, 'https://uuais.com')
    expect(mockSendTemplatedEmail.mock.calls[0][0].variables.project_url).toBe(
      'https://uuais.com/showcase/s1',
    )
  })

  it('sends nothing when the builder has no email or has unsubscribed', async () => {
    mockGetUserProfile.mockResolvedValue({ id: 'u1' })
    await notifyShowcaseApproved(project, 'https://uuais.com')
    mockGetUserProfile.mockResolvedValue({ id: 'u1', email: 'ada@example.com', unsubscribedFromEmails: true })
    await notifyShowcaseApproved(project, 'https://uuais.com')
    expect(mockSendTemplatedEmail).not.toHaveBeenCalled()
  })

  // Publishing must not fail because the mail queue did.
  it('swallows delivery failures', async () => {
    mockGetUserProfile.mockResolvedValue({ id: 'u1', email: 'ada@example.com' })
    mockSendTemplatedEmail.mockRejectedValue(new Error('mail down'))
    await expect(notifyShowcaseApproved(project, 'https://uuais.com')).resolves.toBeUndefined()
  })
})
