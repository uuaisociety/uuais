import { render, screen, fireEvent, act } from '@testing-library/react'
import ShowcaseSubmissionModal, { parseTags } from '@/components/showcase/ShowcaseSubmissionModal'
import { SHOWCASE_LIMITS } from '@/types'

jest.mock('@/contexts/AppContext', () => ({
  useApp: () => ({ dispatch: jest.fn(), state: {} }),
}))
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({ user: { uid: 'u1', displayName: 'Ada' }, isAdmin: true }),
}))
jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}))
jest.mock('@/lib/firestore/users', () => ({
  getUserProfile: jest.fn().mockResolvedValue({ isMember: true }),
}))

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
