import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GenerateBlogModal from '@/components/pages/admin/modals/GenerateBlogModal'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const candidate = {
  id: '1',
  title: 'GPT-5 released',
  url: 'https://openai.com/x',
  source: 'OpenAI',
  snippet: 'Snippet',
}

const candidatesResponse = {
  success: true,
  candidates: [candidate],
  sources: { feeds: ['OpenAI'], exa: true },
  warnings: [],
}

function sseResponse(events: Record<string, unknown>[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const ev of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`))
      controller.close()
    },
  })
  return { ok: true, body, json: async () => ({}) }
}

describe('GenerateBlogModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseApp.mockReturnValue({ state: { events: [] }, dispatch: jest.fn() })
    global.fetch = jest.fn()
  })

  it('renders and loads candidates on open', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => candidatesResponse })
    render(<GenerateBlogModal open onClose={jest.fn()} onDraftCreated={jest.fn()} />)
    expect(await screen.findByText('GPT-5 released')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Let the AI pick/ })).toBeChecked()
  })

  it('auto-picks by default and streams the draft to completion', async () => {
    const onDraftCreated = jest.fn()
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => candidatesResponse })
      .mockResolvedValueOnce(sseResponse([
        { type: 'status', text: 'Drafting…' },
        { type: 'delta', text: 'Weekly digest' },
        { type: 'done', draftId: 'draft-1' },
      ]))
    render(<GenerateBlogModal open onClose={jest.fn()} onDraftCreated={onDraftCreated} />)
    await screen.findByText('GPT-5 released')
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }))
    await waitFor(() => expect(onDraftCreated).toHaveBeenCalledWith('draft-1'))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
    expect(body.type).toBe('weekly-digest')
    expect(body.autoPick).toBe(true)
    expect(body.selectedItems).toEqual([])
  })

  it('shows a live styled preview of the article as the model writes it', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => candidatesResponse })
      .mockResolvedValueOnce(sseResponse([
        { type: 'reasoning', text: 'Picking top stories.' },
        {
          type: 'delta',
          text: '{"title": "Weekly AI Digest", "excerpt": "The week in AI.", "contentHtml": "<h2>Open models</h2><p>New releases dropped this week.</p>"}',
        },
        { type: 'done', draftId: 'draft-9' },
      ]))
    render(<GenerateBlogModal open onClose={jest.fn()} onDraftCreated={jest.fn()} />)
    await screen.findByText('GPT-5 released')
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }))

    // Styled preview renders title, excerpt and the article HTML.
    expect(await screen.findByText('Weekly AI Digest')).toBeInTheDocument()
    expect(screen.getByText('The week in AI.')).toBeInTheDocument()
    expect(screen.getByText('Open models')).toBeInTheDocument()
    expect(screen.getByText('New releases dropped this week.')).toBeInTheDocument()

    // The model's thinking is displayed live above the preview.
    expect(screen.getByText('Picking top stories.')).toBeInTheDocument()
    expect(screen.getByText('Thinking')).toBeInTheDocument()

    // Raw output is still one toggle away.
    fireEvent.click(screen.getByText('Show raw output'))
    expect(screen.getByText(/"Weekly AI Digest"/)).toBeInTheDocument()
  })

  it('posts manually selected items when auto-pick is disabled', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => candidatesResponse })
      .mockResolvedValueOnce(sseResponse([{ type: 'done', draftId: 'draft-1' }]))
    render(<GenerateBlogModal open onClose={jest.fn()} onDraftCreated={jest.fn()} />)
    await screen.findByText('GPT-5 released')
    fireEvent.click(screen.getByRole('checkbox', { name: /Let the AI pick/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /GPT-5 released/ }))
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }))
    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBe(2))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
    expect(body.autoPick).toBe(false)
    expect(body.selectedItems).toHaveLength(1)
    expect(body.selectedItems[0].title).toBe('GPT-5 released')
  })

  it('blocks generate when auto-pick is disabled and nothing is selected', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => candidatesResponse })
    render(<GenerateBlogModal open onClose={jest.fn()} onDraftCreated={jest.fn()} />)
    await screen.findByText('GPT-5 released')
    fireEvent.click(screen.getByRole('checkbox', { name: /Let the AI pick/ }))
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }))
    expect(screen.getByText(/Select at least one news item/)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('surfaces the raw model output on a generation error', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => candidatesResponse })
      .mockResolvedValueOnce(sseResponse([
        { type: 'error', message: 'The model did not return valid JSON', raw: '{"title{ "title":' },
      ]))
    render(<GenerateBlogModal open onClose={jest.fn()} onDraftCreated={jest.fn()} />)
    await screen.findByText('GPT-5 released')
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }))
    expect(await screen.findByText(/did not return valid JSON/)).toBeInTheDocument()
    expect(screen.getByText(/Raw model output/)).toBeInTheDocument()
    expect(screen.getByText('{"title{ "title":')).toBeInTheDocument()
  })
})
