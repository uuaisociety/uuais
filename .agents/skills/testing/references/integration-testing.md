# Integration Testing (Next.js API Routes)

## Standard Pattern

The project tests API routes using `NextRequest`/`NextResponse` directly — no Supertest.

```typescript
import { NextRequest } from 'next/server'

const mockFetch = jest.fn()
jest.mock('@/lib/some-module', () => ({ fetchData: (...args: unknown[]) => mockFetch(...args) }))

describe('GET /api/resource', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns data on success', async () => {
    mockFetch.mockResolvedValue([{ id: '1', name: 'Test' }])
    const { GET } = await import('@/app/api/resource/route')
    const req = new NextRequest('http://localhost/api/resource')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })

  it('returns 401 when not authenticated', async () => {
    const { GET } = await import('@/app/api/resource/route')
    const req = new NextRequest('http://localhost/api/resource')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('returns 500 on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('db down'))
    const { GET } = await import('@/app/api/resource/route')
    const req = new NextRequest('http://localhost/api/resource')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})
```

## Authenticated Requests

```typescript
// Mock auth token extraction at the top of the test file
const mockGetTokens = jest.fn()
jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))

it('handles admin-only route', async () => {
  mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
  const { GET } = await import('@/app/api/admin/resource/route')
  const req = new NextRequest('http://localhost/api/admin/resource')
  const res = await GET(req)

  expect(res.status).toBe(200)
})
```

## Query Parameters

```typescript
it('filters by search query', async () => {
  mockFetch.mockResolvedValue(allItems)
  const { GET } = await import('@/app/api/resource/route')
  const req = new NextRequest('http://localhost/api/resource?search=test&page=1&limit=10')
  const res = await GET(req)
  const body = await res.json()

  expect(body.items).toHaveLength(1)
  expect(body.pagination.page).toBe(1)
})
```

## Key Differences from Supertest

| Area | This project | Supertest approach |
|------|-------------|-------------------|
| Request object | `new NextRequest(url)` | `request(app).get(url)` |
| Response | Route handler returns `NextResponse` | `request(app)` returns a supertest wrapper |
| Auth mocking | Mock `getTokens` from `next-firebase-auth-edge` | Set `Authorization` header |
| Dynamic imports | `await import('@/app/api/.../route')` to get handler | Static import of `app` instance |

Run via `npm run test:integration` for API-specific tests, or `npm test` for all.
