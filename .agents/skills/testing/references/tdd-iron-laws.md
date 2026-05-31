# TDD Iron Laws

## Fundamental Principle

> **NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

## The Three Iron Laws

### Iron Law 1
> "You shall not write any production code unless it is to make a failing test pass."

### Iron Law 2
> "If you didn't watch the test fail, you don't know if it tests the right thing."

### Iron Law 3
> "Production code exists → A test exists that failed first. Otherwise → It's not TDD."

## RED-GREEN-REFACTOR Cycle

### RED: Write one minimal failing test
```typescript
it('should return 0 for empty array', () => {
  expect(sum([])).toBe(0);
});
// Run: ✗ FAIL - sum is not defined
```

### GREEN: Simplest passing code
```typescript
function sum(numbers: number[]): number {
  return 0;
}
// Run: ✓ PASS
```

### REFACTOR: Improve while green
```typescript
function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}
// Run: ✓ PASS
```

## Verification Checklist

- [ ] Every production function has corresponding tests
- [ ] Each test was written before its implementation
- [ ] Each test was observed to fail first
- [ ] Tests verify behavior, not implementation
- [ ] Refactoring kept all tests green
- [ ] No production code exists without a test
