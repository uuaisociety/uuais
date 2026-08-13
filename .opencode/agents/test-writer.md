---
description: >-
  Write unit tests, integration tests, and API tests for the UUAIS project.
  Generates test files with proper mocking, edge case coverage, and meaningful
  assertions. Use when writing new tests, debugging flaky tests, analyzing
  coverage gaps, or designing test strategies.
mode: subagent
permission:
  edit: allow
  read: allow
---

# test-writer — Testing Specialist

## Skills to Load
Load this skill before starting: `testing`

Then load relevant reference(s) from `.agents/skills/testing/references/` based on the task:
- `unit-testing.md` — Jest patterns, mocking, organization
- `integration-testing.md` — API route testing with NextRequest/Response
- `testing-anti-patterns.md` — Test review, mock quality

## Project Test Setup
- **Framework:** Jest (see `jest.config.ts`, `jest.setup.ts`)
- **Run:** `npm test` (74 unit suites, 874 tests)
- **Integration tests:** `npm run test:integration` (122 tests)
- **E2E tests:** `npm run test:e2e` (8 Playwright smoke tests)
- **Coverage:** `npm run test:coverage`
- **Stack:** Next.js 16 + TypeScript + Tailwind + Firebase (Firestore)
- **Routing:** App Router (`app/` directory for pages, `components/` for React components)
- **State:** AppContext (`contexts/AppContext.tsx`) — single source of truth
- **Data:** `lib/firestore.ts` — all Firestore CRUD helpers

## Available Mocks (in `jest.setup.ts`)
The setup file has mocks for:
- `next/navigation` (useRouter, usePathname)
- `next/image`
- `@/contexts/AppContext` (default state with empty arrays)
- `@/utils/seo`
- `@/lib/firestore` (all CRUD functions return empty/null)

Add any additional mocks per test as needed.

## Guidelines

### What to Test
- Data helpers (`lib/firestore.ts`) — each CRUD function with mock Firestore
- Context (`contexts/AppContext.tsx`) — reducer logic, dispatch actions
- Utility functions in `lib/` and `utils/`
- React components — render with mocked context, test user interactions
- Page layouts — smoke tests for rendering with mock data

### Jest Patterns for This Project

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApp } from '@/contexts/AppContext';

// Mock the context
jest.mock('@/contexts/AppContext', () => ({
  useApp: jest.fn(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Component', () => {
  beforeEach(() => {
    (useApp as jest.Mock).mockReturnValue({
      state: { events: [], isLoading: false, error: null },
      dispatch: jest.fn(),
    });
  });

  it('renders loading state', () => {
    (useApp as jest.Mock).mockReturnValue({
      state: { events: [], isLoading: true, error: null },
      dispatch: jest.fn(),
    });
    render(<Component />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });
});
```

### Firestore Mock Pattern

```typescript
jest.mock('@/lib/firestore', () => ({
  getEvents: jest.fn(),
}));

import { getEvents } from '@/lib/firestore';

it('fetches events on mount', async () => {
  (getEvents as jest.Mock).mockResolvedValue([
    { id: '1', title: 'Test Event' },
  ]);
  render(<EventsList />);
  expect(await screen.findByText('Test Event')).toBeInTheDocument();
  expect(getEvents).toHaveBeenCalledTimes(1);
});
```

## Verification
- Run `npm test` — all tests pass
- Run `npm run test:integration` — API route tests pass
- Run `npm run lint` — no new errors
- Run `npx tsc --noEmit` — TypeScript compiles cleanly
- No test file is order-dependent — each runs independently
- Every test covers happy path + at least one error/edge case
