jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'collection'),
  query: jest.fn((ref: unknown, ...conds: unknown[]) => ({ ref, conds })),
  where: jest.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  orderBy: jest.fn((field: string, dir: string) => ({ field, dir })),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, id: 's1', data: () => null }),
  addDoc: jest.fn().mockResolvedValue({ id: 'new-id' }),
  doc: jest.fn(() => ({ id: 's1' })),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  onSnapshot: jest.fn((_qy: unknown, cb: (s: unknown) => void) => {
    cb({ docs: [] })
    return () => {}
  }),
}))

jest.mock('@/lib/firebase-client', () => ({ db: {} }))

jest.mock('@/lib/firestore/utils', () => ({
  stripUndefined: (x: unknown) => JSON.parse(JSON.stringify(x)),
}))

import * as firestore from 'firebase/firestore'
import {
  getShowcaseProjects,
  getShowcaseProjectById,
  addShowcaseProject,
  updateShowcaseProject,
  deleteShowcaseProject,
  subscribeToShowcaseProjects,
} from '@/lib/firestore/showcase'

const projectDoc = { title: 'Course Navigator', published: true, createdAt: '2026-01-01' }

function snapshotWith(docs: { id: string; data: unknown }[]) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) }
}

describe('showcase firestore helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(firestore.getDocs as jest.Mock).mockResolvedValue(snapshotWith([{ id: 's1', data: projectDoc }]))
    ;(firestore.getDoc as jest.Mock).mockResolvedValue({ exists: () => true, id: 's1', data: () => projectDoc })
    ;(firestore.onSnapshot as jest.Mock).mockImplementation((_qy: unknown, cb: (s: unknown) => void) => {
      cb(snapshotWith([{ id: 's1', data: projectDoc }]))
      return () => {}
    })
  })

  it('getShowcaseProjects returns docs with ids', async () => {
    const projects = await getShowcaseProjects()
    expect(projects).toEqual([{ ...projectDoc, id: 's1' }])
  })

  it('getShowcaseProjectById returns the doc', async () => {
    const project = await getShowcaseProjectById('s1')
    expect(project).toEqual({ ...projectDoc, id: 's1' })
  })

  it('getShowcaseProjectById returns null when missing', async () => {
    ;(firestore.getDoc as jest.Mock).mockResolvedValue({ exists: () => false, id: 's1', data: () => null })
    const project = await getShowcaseProjectById('nope')
    expect(project).toBeNull()
  })

  it('addShowcaseProject returns the new id', async () => {
    const id = await addShowcaseProject({ title: 'X' } as never)
    expect(id).toBe('new-id')
  })

  it('updateShowcaseProject updates the doc', async () => {
    await expect(updateShowcaseProject('s1', { title: 'Y' })).resolves.toBeUndefined()
  })

  it('deleteShowcaseProject deletes the doc', async () => {
    await expect(deleteShowcaseProject('s1')).resolves.toBeUndefined()
  })

  it('subscribeToShowcaseProjects streams projects and returns unsubscribe', () => {
    const cb = jest.fn()
    const unsub = subscribeToShowcaseProjects(cb)
    expect(cb).toHaveBeenCalledWith([{ ...projectDoc, id: 's1' }])
    expect(unsub).toBeInstanceOf(Function)
  })
})
