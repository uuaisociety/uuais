import { TeamMember } from '@/types'

const mockUpdate = jest.fn()
const mockCommit = jest.fn().mockResolvedValue(undefined)
const mockBatch = { update: mockUpdate, commit: mockCommit }

jest.mock('firebase/firestore', () => ({
  writeBatch: jest.fn(() => mockBatch),
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
}))

jest.mock('@/lib/firebase-client', () => ({
  db: {},
}))

import { moveTeamMember } from '@/lib/firestore/team'

const makeMember = (id: string, order: number, years: number[]): TeamMember =>
  ({ id, name: id, position: 'Member', order, years }) as TeamMember

const members: TeamMember[] = [
  makeMember('alice', 0, [2025, 2026]),
  makeMember('bob', 1, [2025]),
  makeMember('carol', 2, [2026]),
  makeMember('dave', 3, [2025, 2026]),
]

const orderAfterMove = () =>
  mockUpdate.mock.calls.map(([ref, data]: [{ id: string }, { order: number }]) => [ref.id, data.order])

describe('moveTeamMember', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('swaps with the adjacent member in the same year when a year is given', async () => {
    await moveTeamMember(members, 'alice', 'down', 2026)

    expect(orderAfterMove()).toEqual([
      ['carol', 0],
      ['bob', 1],
      ['alice', 2],
      ['dave', 3],
    ])
    expect(mockCommit).toHaveBeenCalled()
  })

  it('moves a member up relative to others in the same year', async () => {
    await moveTeamMember(members, 'dave', 'up', 2026)

    expect(orderAfterMove()).toEqual([
      ['alice', 0],
      ['bob', 1],
      ['dave', 2],
      ['carol', 3],
    ])
  })

  it('scopes 2025 moves to the 2025 list, not the global neighbor', async () => {
    await moveTeamMember(members, 'dave', 'up', 2025)

    expect(orderAfterMove()).toEqual([
      ['alice', 0],
      ['dave', 1],
      ['carol', 2],
      ['bob', 3],
    ])
  })

  it('swaps with the global neighbor when no year is given', async () => {
    await moveTeamMember(members, 'alice', 'down')

    expect(orderAfterMove()).toEqual([
      ['bob', 0],
      ['alice', 1],
      ['carol', 2],
      ['dave', 3],
    ])
  })

  it('does nothing when the member is already at the boundary of the year', async () => {
    await moveTeamMember(members, 'alice', 'up', 2026)
    await moveTeamMember(members, 'dave', 'down', 2026)

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockCommit).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown member', async () => {
    await moveTeamMember(members, 'ghost', 'up', 2026)

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockCommit).not.toHaveBeenCalled()
  })
})
