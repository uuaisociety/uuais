---
name: testing
description: >-
  Comprehensive testing specialist — write unit/integration/API tests, create
  mocking strategies, analyze coverage, and produce test plans/reports. Uses
  Jest with Next.js + TypeScript + Firebase. Use when writing any tests,
  debugging flaky tests, analyzing coverage gaps, or designing test strategies.
license: MIT
user-invocable: true
---

# Testing Skill

Comprehensive testing specialist for the UUAIS project (Jest + Next.js + TypeScript + Firebase).

## Core Workflow

1. **Define scope** — Identify what to test and which testing types apply
2. **Create strategy** — Plan the test approach
3. **Write tests** — Implement with proper assertions and mocking
4. **Execute** — Run tests and collect results; if tests fail, classify (assertion vs. environment), fix root cause, re-run
5. **Report** — Document findings with severity and fix recommendations

## Project Context

- **Framework:** Jest (see `jest.config.ts`, `jest.setup.ts` in root — fully default config)
- **Stack:** Next.js 16 + TypeScript + Firebase
- **Run:** `npm test` `npm run test:integration` `npm run test:e2e`
- **Admin scripts:** ts-node, require `GOOGLE_APPLICATION_CREDENTIALS`

## Quick-Start Example (Jest)

```typescript
import { describe, it, expect, jest } from '@jest/globals';

describe('calculateDiscount', () => {
  it('applies 10% discount for premium users', () => {
    const result = calculateDiscount({ price: 100, userTier: 'premium' });
    expect(result).toBe(90);
  });

  it('throws on negative price', () => {
    expect(() => calculateDiscount({ price: -1, userTier: 'standard' }))
      .toThrow('Price must be non-negative');
  });
});
```

## Reference Guides

Load detailed guidance from `references/` based on context:

| Topic | File | When to Load |
|-------|------|-------------|
| Unit Testing | `references/unit-testing.md` | Jest patterns, mocking, organization |
| Integration Testing | `references/integration-testing.md` | API route testing with NextRequest/Response |
| Testing Anti-Patterns | `references/testing-anti-patterns.md` | Test review, mock quality |

## Constraints

**MUST DO:**
- Test happy paths AND error/edge cases (empty, null, boundary values)
- Mock external dependencies — never call real APIs or databases in unit tests
- Use meaningful `it('…')` descriptions as plain-English specifications
- Assert specific outcomes (`expect(result).toBe(90)`), not just truthiness
- Run tests via `npm test`; verify no regressions

**MUST NOT:**
- Skip error-path testing
- Use production data — use fixtures/factories
- Create order-dependent tests — each must be independently runnable
- Ignore flaky tests — quarantine and fix them
- Test implementation details — test observable behaviour

## Output Templates

When creating test plans, provide:
1. Test scope and approach
2. Test cases with expected outcomes
3. Coverage analysis
4. Findings with severity (Critical/High/Medium/Low)
5. Specific fix recommendations
