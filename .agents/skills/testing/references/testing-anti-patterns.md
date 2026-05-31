# Testing Anti-Patterns

## Anti-Pattern 1: Testing Mock Behavior
Verifying mocks exist rather than testing actual output.

```typescript
// ❌ BAD: Testing the mock
it('should call the API', () => {
  const mockApi = jest.fn().mockResolvedValue({ data: 'test' });
  const service = new UserService(mockApi);
  service.getUser(1);
  expect(mockApi).toHaveBeenCalledWith(1); // tests mock, not result
});

// ✅ GOOD: Testing actual behavior
it('should return user data', async () => {
  const mockApi = jest.fn().mockResolvedValue({ id: 1, name: 'Alice' });
  const service = new UserService(mockApi);
  const user = await service.getUser(1);
  expect(user.name).toBe('Alice'); // tests actual output
});
```

## Anti-Pattern 2: Over-Mocking
Mocking everything without understanding side effects.

**Fix:** Mock at the appropriate level — external services only, not internal logic.

## Anti-Pattern 3: Incomplete Mocks
Partial mock responses missing downstream fields.

**Fix:** Use factories to generate complete mock objects with sensible defaults.

## Anti-Pattern 4: Tests as Afterthought
"Write tests later" always ships without tests.

**Fix:** Tests are part of implementation, not documentation. No feature is done without tests.
