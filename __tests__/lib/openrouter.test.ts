import { generateStructured, streamCompletion } from '@/lib/ai/openrouter'

const mockFetch = jest.fn()
global.fetch = mockFetch

function openRouterResponse(content: string) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
  }
}

function sseChunks(chunks: Array<{ reasoning?: string; content?: string; usage?: object }>) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: c }] })}\n\n`))
      }
      controller.close()
    },
  })
  return { ok: true, body }
}

describe('generateStructured', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('returns parsed JSON when the model answers clean JSON', async () => {
    mockFetch.mockResolvedValue(openRouterResponse(JSON.stringify({ ok: true, n: 1 })))
    const result = await generateStructured<{ ok: boolean; n: number }>([{ role: 'user', content: 'go' }])
    expect(result.data).toEqual({ ok: true, n: 1 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('extracts JSON wrapped in markdown code fences', async () => {
    mockFetch.mockResolvedValue(openRouterResponse('```json\n{"ok": true}\n```'))
    const result = await generateStructured<{ ok: boolean }>([{ role: 'user', content: 'go' }])
    expect(result.data).toEqual({ ok: true })
  })

  it('extracts JSON embedded after prose narration', async () => {
    mockFetch.mockResolvedValue(
      openRouterResponse('Let me pick the best stories. The top one is clearly X.\n{"ok": true}')
    )
    const result = await generateStructured<{ ok: boolean }>([{ role: 'user', content: 'go' }])
    expect(result.data).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries once when the model only outputs prose, then parses the repair response', async () => {
    mockFetch
      .mockResolvedValueOnce(
        openRouterResponse('We need to select stories. Candidates: - Story A - Story B')
      )
      .mockResolvedValueOnce(openRouterResponse(JSON.stringify({ ok: true, n: 2 })))

    const result = await generateStructured<{ ok: boolean; n: number }>([{ role: 'user', content: 'go' }])
    expect(result.data).toEqual({ ok: true, n: 2 })
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // The repair call must append a JSON-only instruction.
    const retryBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    expect(retryBody.messages.at(-1).content).toMatch(/valid JSON object/i)
  })

  it('throws a 502 error after the retry also fails to produce JSON', async () => {
    mockFetch
      .mockResolvedValueOnce(openRouterResponse('just prose'))
      .mockResolvedValueOnce(openRouterResponse('still prose'))

    await expect(
      generateStructured<{ ok: boolean }>([{ role: 'user', content: 'go' }])
    ).rejects.toMatchObject({ name: 'OpenRouterError', statusCode: 502 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('keeps JSON with braces inside string values intact', async () => {
    const content = JSON.stringify({ title: 'Release {1.0} notes', items: ['a', 'b'] })
    mockFetch.mockResolvedValue(openRouterResponse(`Intro text... ${content}`))
    const result = await generateStructured<{ title: string; items: string[] }>([
      { role: 'user', content: 'go' },
    ])
    expect(result.data.title).toBe('Release {1.0} notes')
    expect(result.data.items).toEqual(['a', 'b'])
  })

  it('returns the model reasoning alongside the parsed data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { role: 'assistant', content: JSON.stringify({ ok: true }), reasoning: 'Picking top stories.' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    })
    const result = await generateStructured<{ ok: boolean }>([{ role: 'user', content: 'go' }])
    expect(result.data).toEqual({ ok: true })
    expect(result.reasoning).toBe('Picking top stories.')
  })
})

describe('streamCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  it('accumulates reasoning and content deltas and forwards them via onChunk', async () => {
    mockFetch.mockResolvedValue(
      sseChunks([
        { reasoning: 'Think' },
        { content: '{"ok":' },
        { content: ' true}' },
      ])
    )
    const chunks: string[] = []
    const result = await streamCompletion(
      [{ role: 'user', content: 'go' }],
      {},
      (c) => { chunks.push(c.reasoning || c.content) }
    )
    expect(chunks).toEqual(['Think', '{"ok":', ' true}'])
    expect(result.content).toBe('{"ok": true}')
    expect(result.reasoning).toBe('Think')
    // streaming request must set stream:true + include_usage
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.stream).toBe(true)
    expect(body.stream_options).toEqual({ include_usage: true })
  })
})
