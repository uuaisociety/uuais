// POST /api/admin/team-directory: clears the day-long public team directory cache.
import { NextRequest } from 'next/server';
import { createAuthMocks } from '@/__tests__/helpers/mocks';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockRevalidateTag = jest.fn();
jest.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

async function post() {
  const { POST } = await import('@/app/api/admin/team-directory/route');
  return POST(
    new NextRequest('http://localhost/api/admin/team-directory', {
      method: 'POST',
    }),
  );
}

describe('POST /api/admin/team-directory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the team directory cache immediately for an admin', async () => {
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin1', admin: true },
    });
    const response = await post();
    expect(response.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledWith('team-directory', {
      expire: 0,
    });
  });

  it('refuses a signed-in member who is not an admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'member1' } });
    expect((await post()).status).toBe(403);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it('refuses an anonymous request', async () => {
    mockGetTokens.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });
});
