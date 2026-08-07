const mockRefreshSessionCookie = jest.fn()

jest.mock('@/lib/firebase-client', () => ({
  db: {},
  refreshSessionCookie: (...args: unknown[]) => mockRefreshSessionCookie(...args),
}))

describe('teamApplications delete', () => {
  const mockFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  describe('deleteTeamApplicationWithLimits', () => {
    it('deletes via the admin API route including resume cleanup', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })

      const { deleteTeamApplicationWithLimits } = await import('@/lib/firestore/teamApplications')
      await deleteTeamApplicationWithLimits('app-1', 'alice@test.com', 'spring2026')

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/team-applications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'app-1', emailNormalized: 'alice@test.com', campaignId: 'spring2026' }),
      })
    })

    it('refreshes the session cookie before deleting', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })
      mockRefreshSessionCookie.mockResolvedValue(undefined)

      const { deleteTeamApplicationWithLimits } = await import('@/lib/firestore/teamApplications')

      await deleteTeamApplicationWithLimits('app-1', 'alice@test.com', 'spring2026')

      expect(mockRefreshSessionCookie).toHaveBeenCalledTimes(1)
      const calls = mockFetch.mock.calls.map((c) => c[0])
      expect(calls[0]).toBe('/api/admin/team-applications')
    })

    it('throws when the admin route reports a failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'internal error' }) })

      const { deleteTeamApplicationWithLimits } = await import('@/lib/firestore/teamApplications')
      await expect(deleteTeamApplicationWithLimits('app-1', 'a@b.com', 'spring2026')).rejects.toThrow(/internal error/)
    })

    it('falls back to a generic error when the response body is unreadable', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => { throw new Error('bad body') } })

      const { deleteTeamApplicationWithLimits } = await import('@/lib/firestore/teamApplications')
      await expect(deleteTeamApplicationWithLimits('app-1', 'a@b.com', 'spring2026')).rejects.toThrow(/Failed to delete application \(401\)/)
    })
  })
})
