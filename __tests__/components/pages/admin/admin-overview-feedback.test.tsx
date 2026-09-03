import { renderHook } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAdminOverview } from '@/components/pages/admin/useAdminOverview'
import AdminStatusStrip from '@/components/pages/admin/AdminStatusStrip'

// The overview subscribes through the real Firebase client at import time; CI has no keys.
jest.mock('@/lib/firebase-client', () => ({ auth: {}, db: {} }))

const appState = {
  events: [],
  blogPosts: [],
  showcaseProjects: [],
  blogPostsLoaded: true,
  eventsLoaded: true,
  showcaseLoaded: true,
}

const report = (id: string) => ({
  id,
  programSlug: 'ttf2y',
  programName: 'Engineering Physics',
  trackId: null,
  courseCode: '1MA360',
  kind: 'wrong-prerequisite',
  message: 'This is not actually a prerequisite.',
  contact: null,
  status: 'open',
  createdAt: '2026-09-02T10:00:00.000Z',
})

const withReports = (reports: unknown[]) => {
  global.__setAppState(appState)
  global.__setCollectionData({
    subscribeOpenCampaigns: { data: [], loaded: true },
    subscribeToTeamApplications: { data: [], loaded: true },
    subscribeOpenProgramFeedback: { data: reports, loaded: true },
  })
}

describe('useAdminOverview — programme feedback', () => {
  afterEach(() => {
    global.__setAppState(null)
    global.__setCollectionData(null)
  })

  it('raises a task for reports nobody has dealt with', () => {
    withReports([report('a'), report('b')])

    const { result } = renderHook(() => useAdminOverview())
    const item = result.current.items.find((i) => i.tab === 'programs')

    expect(item).toEqual({
      tab: 'programs',
      sub: 'feedback',
      label: 'Programme error reports to review',
      count: 2,
    })
  })

  it('reads as one report in the singular', () => {
    withReports([report('a')])

    const { result } = renderHook(() => useAdminOverview())

    expect(result.current.items.find((i) => i.tab === 'programs')?.label).toBe(
      'Programme error report to review'
    )
  })

  // Resolved reports are filtered out by the query, so an empty set means nothing is waiting.
  it('stays quiet when every report has been handled', () => {
    withReports([])

    const { result } = renderHook(() => useAdminOverview())

    expect(result.current.items.some((i) => i.tab === 'programs')).toBe(false)
  })

  it('waits for the reports before claiming the dashboard is loaded', () => {
    global.__setAppState(appState)
    global.__setCollectionData({
      subscribeOpenCampaigns: { data: [], loaded: true },
      subscribeToTeamApplications: { data: [], loaded: true },
      subscribeOpenProgramFeedback: { data: [], loaded: false },
    })

    const { result } = renderHook(() => useAdminOverview())

    expect(result.current.loaded).toBe(false)
  })
})

describe('AdminStatusStrip', () => {
  it('opens the subtab the work actually lives on', async () => {
    const onNavigate = jest.fn()
    render(
      <AdminStatusStrip
        loaded
        onNavigate={onNavigate}
        items={[
          { tab: 'programs', sub: 'feedback', label: 'Programme error reports to review', count: 2 },
        ]}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /Programme error reports/i }))

    expect(onNavigate).toHaveBeenCalledWith('programs', 'feedback')
  })
})
