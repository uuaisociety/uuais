# Unit Testing (Jest)

## Standard Pattern

```typescript
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('UserService', () => {
  let service: UserService;
  let mockRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepo = { findById: jest.fn(), save: jest.fn() } as any;
    service = new UserService(mockRepo);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getUser', () => {
    it('returns user when found', async () => {
      const user = { id: '1', name: 'Test' };
      mockRepo.findById.mockResolvedValue(user);

      const result = await service.getUser('1');

      expect(result).toEqual(user);
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
    });

    it('throws when user not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getUser('1')).rejects.toThrow('User not found');
    });
  });
});
```

## Mocking Patterns

```typescript
// Mock functions
const mockFn = jest.fn();
mockFn.mockReturnValue('value');
mockFn.mockResolvedValue('async value');
mockFn.mockRejectedValue(new Error('error'));

// Mock modules
jest.mock('./database', () => ({
  query: jest.fn(),
}));

// Spy on existing methods
jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock Firebase (common in this project)
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));
```

## Test Organization

```typescript
describe('Feature', () => {
  describe('happy path', () => {
    it('does expected behavior', () => {});
  });

  describe('edge cases', () => {
    it('handles empty input', () => {});
    it('handles max values', () => {});
  });

  describe('error cases', () => {
    it('throws on invalid input', () => {});
  });
});
```

## Edge Cases to Always Cover

- Empty input / null / undefined
- Boundary values (0, max, min)
- Whitespace handling
- Special characters / XSS in strings
- Duplicate values
- Concurrent calls (async race conditions)
