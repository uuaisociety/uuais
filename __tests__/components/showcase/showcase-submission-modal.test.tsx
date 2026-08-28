import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import ShowcaseSubmissionModal, { parseTags } from '@/components/showcase/ShowcaseSubmissionModal'
import { SHOWCASE_LIMITS } from '@/types'

const mockDispatch = jest.fn()
const mockNotify = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => ({ dispatch: mockDispatch, state: {} }),
}))
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({ user: { uid: 'u1', displayName: 'Ada' }, isAdmin: true }),
}))
jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: mockNotify }),
}))
jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue({ isMember: true }),
}))

const originalFetch = global.fetch

/** Fire a real beforeunload and report whether something asked the browser to stop. */
function tabClose() {
  const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
  act(() => {
    window.dispatchEvent(event)
  })
  return event.defaultPrevented
}

describe('ShowcaseSubmissionModal unsaved-work guard', () => {
  it('does not warn when the modal is closed', () => {
    render(<ShowcaseSubmissionModal open={false} onClose={jest.fn()} />)
    expect(tabClose()).toBe(false)
  })

  // Prompting over an untouched form is how people learn to dismiss the prompt.
  it('does not warn when the form is untouched', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    expect(tabClose()).toBe(false)
  })

  it('warns once the member has typed something', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('e.g. HackUppsala Slackbot'), {
      target: { value: 'My project' },
    })
    expect(tabClose()).toBe(true)
  })

  it('warns for a link entered on its own', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('https://github.com/you/project'), {
      target: { value: 'https://github.com/me/thing' },
    })
    expect(tabClose()).toBe(true)
  })

  it('stops warning once the field is cleared again', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    const title = screen.getByPlaceholderText('e.g. HackUppsala Slackbot')
    fireEvent.change(title, { target: { value: 'My project' } })
    expect(tabClose()).toBe(true)
    fireEvent.change(title, { target: { value: '' } })
    expect(tabClose()).toBe(false)
  })

  it('drops the guard when the modal closes', () => {
    const { rerender } = render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('e.g. HackUppsala Slackbot'), {
      target: { value: 'My project' },
    })
    expect(tabClose()).toBe(true)
    rerender(<ShowcaseSubmissionModal open={false} onClose={jest.fn()} />)
    expect(tabClose()).toBe(false)
  })

  // A listener left behind would guard every page the member visits afterwards.
  it('removes the listener on unmount', () => {
    const { unmount } = render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('e.g. HackUppsala Slackbot'), {
      target: { value: 'My project' },
    })
    expect(tabClose()).toBe(true)
    unmount()
    expect(tabClose()).toBe(false)
  })
})


describe('parseTags', () => {
  it('normalises, trims and de-duplicates', () => {
    expect(parseTags('  LLM , hackathon,llm ,  ').tags).toEqual(['llm', 'hackathon'])
  })

  it('reports how many tags are over the count limit rather than dropping them quietly', () => {
    const r = parseTags('a,b,c,d,e,f,g')
    expect(r.tags).toHaveLength(SHOWCASE_LIMITS.tagCount)
    expect(r.overflow).toBe(2)
  })

  it('reports tags longer than the limit instead of truncating them', () => {
    const long = 'x'.repeat(SHOWCASE_LIMITS.tag + 1)
    const r = parseTags(`short,${long}`)
    expect(r.tooLong).toEqual([long])
    // The old code silently stored a chopped version; nothing is altered now.
    expect(r.tags).toContain(long)
  })

  it('accepts a tag exactly at the limit', () => {
    const exact = 'y'.repeat(SHOWCASE_LIMITS.tag)
    expect(parseTags(exact).tooLong).toEqual([])
  })

  it('is empty for an empty field', () => {
    expect(parseTags('   ,  , ')).toEqual({ tags: [], tooLong: [], overflow: 0 })
  })
})

describe('ShowcaseSubmissionModal tag field', () => {
  const tagField = () => screen.getByPlaceholderText('llm, hackathon, next.js')

  it('caps every text field at its shared limit', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    expect(screen.getByPlaceholderText('e.g. HackUppsala Slackbot')).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.title))
    expect(screen.getByPlaceholderText(/What did you build/)).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.description))
    expect(screen.getByPlaceholderText(/How did it start/)).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.details))
    // Links previously had no limit at all.
    expect(screen.getByPlaceholderText('https://github.com/you/project')).toHaveAttribute(
      'maxlength', String(SHOWCASE_LIMITS.link))
  })

  it('previews the tags that will actually be saved', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(tagField(), { target: { value: 'LLM, Hackathon' } })
    const preview = document.getElementById('tags-preview') as HTMLElement
    expect(preview).toHaveTextContent('llm')
    expect(preview).toHaveTextContent('hackathon')
  })

  it('says so when there are more tags than the limit allows', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(tagField(), { target: { value: 'a,b,c,d,e,f' } })
    expect(document.getElementById('tags-preview')).toHaveTextContent(
      `1 tag over the limit of ${SHOWCASE_LIMITS.tagCount}`)
  })

  it('says so when a tag is too long', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(tagField(), { target: { value: 'z'.repeat(SHOWCASE_LIMITS.tag + 1) } })
    expect(document.getElementById('tags-preview')).toHaveTextContent(
      `One tag is longer than ${SHOWCASE_LIMITS.tag} characters`)
  })
})

describe('ShowcaseSubmissionModal submit path', () => {
  const titleField = () => screen.getByPlaceholderText('e.g. HackUppsala Slackbot')
  const descriptionField = () => screen.getByPlaceholderText(/What did you build/)
  const tagField = () => screen.getByPlaceholderText('llm, hackathon, next.js')
  const submitButton = () => screen.getByRole('button', { name: /Submit for review/ })

  beforeEach(() => {
    mockDispatch.mockClear()
    mockNotify.mockClear()
    mockDispatch.mockResolvedValue(undefined)
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  function fillRequired(title = 'My Cool Project', description = 'A description') {
    fireEvent.change(titleField(), { target: { value: title } })
    fireEvent.change(descriptionField(), { target: { value: description } })
  }

  it('refuses submit without a title and does not dispatch', () => {
    const onClose = jest.fn()
    render(<ShowcaseSubmissionModal open onClose={onClose} />)
    fireEvent.change(descriptionField(), { target: { value: 'A description' } })
    fireEvent.click(submitButton())
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Missing fields' }))
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('refuses submit without a description and does not dispatch', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fireEvent.change(titleField(), { target: { value: 'My Cool Project' } })
    fireEvent.click(submitButton())
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Missing fields' }))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('refuses submit when there are more tags than the limit and does not dispatch', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fillRequired()
    fireEvent.change(tagField(), { target: { value: 'a,b,c,d,e,f' } })
    fireEvent.click(submitButton())
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Too many tags', message: expect.stringContaining('remove 1 more') }))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('refuses submit when a tag exceeds the character limit and does not dispatch', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fillRequired()
    fireEvent.change(tagField(), { target: { value: 'z'.repeat(SHOWCASE_LIMITS.tag + 1) } })
    fireEvent.click(submitButton())
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tag too long', message: expect.stringContaining(`limited to ${SHOWCASE_LIMITS.tag}`) }))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('refuses submit when a link is not a valid http(s) URL and does not dispatch', () => {
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    fillRequired()
    fireEvent.change(screen.getByPlaceholderText('https://github.com/you/project'), {
      target: { value: 'not-a-url' },
    })
    fireEvent.click(submitButton())
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Invalid link', message: expect.stringContaining('Github') }))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches ADD_SHOWCASE_PROJECT with the parsed payload on a valid submit', async () => {
    const onClose = jest.fn()
    render(<ShowcaseSubmissionModal open onClose={onClose} />)
    fillRequired('My Cool Project', 'A description')
    fireEvent.change(tagField(), { target: { value: 'LLM, Hackathon' } })
    fireEvent.click(submitButton())
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        firestoreAction: 'ADD_SHOWCASE_PROJECT',
        payload: expect.objectContaining({
          title: 'My Cool Project',
          slug: 'my-cool-project',
          description: 'A description',
          category: 'other',
          creatorUserId: 'u1',
          creatorName: 'Ada',
          links: {},
          tags: ['llm', 'hackathon'],
          votes: 0,
          published: false,
          featured: false,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      }),
    )
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the upload error when POST /api/showcase/image fails and submits nothing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'storage down' }),
    }) as unknown as typeof fetch
    render(<ShowcaseSubmissionModal open onClose={jest.fn()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'cover.png', { type: 'image/png' })] } })
    await waitFor(() =>
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Upload failed', message: 'storage down' })),
    )
    // The failed upload never dispatched anything and left no cover behind.
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    // A cover is optional, so a later submit still works — without cover data.
    fillRequired()
    fireEvent.click(submitButton())
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        firestoreAction: 'ADD_SHOWCASE_PROJECT',
        payload: expect.objectContaining({ coverImage: undefined, coverImagePath: undefined }),
      }),
    )
  })

  it('cleans up the uploaded cover from storage when the modal closes', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ urlPublic: 'https://cdn.example/cover.png', path: 'showcase/cover.png' }),
    }) as unknown as typeof fetch
    global.fetch = fetchMock
    const onClose = jest.fn()
    render(<ShowcaseSubmissionModal open onClose={onClose} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'cover.png', { type: 'image/png' })] } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/showcase/image', expect.objectContaining({ method: 'POST' })))
    // The uploaded cover replaces the upload button with a Remove control.
    await waitFor(() => expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/showcase/image', expect.objectContaining({
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'showcase/cover.png' }),
      })),
    )
    expect(onClose).toHaveBeenCalled()
  })
})
