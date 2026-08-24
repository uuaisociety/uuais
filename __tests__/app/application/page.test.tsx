import ApplicationPage from '@/app/application/page';

const mockRedirect = jest.fn(() => {
  throw new Error('NEXT_REDIRECT');
});

jest.mock('next/navigation', () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error('NEXT_REDIRECT');
  },
}));

describe('app/application (legacy route)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects server-side to the team application flow instead of a client-side hash jump', () => {
    expect(() => ApplicationPage()).toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/apply/team');
  });
});