const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({ notFound: () => mockNotFound() }));

import PartnersRoute from '@/app/partners/page';

describe('/partners while hidden (default)', () => {
  it('returns 404 until the launch flag is set', () => {
    expect(() => PartnersRoute()).toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });
});
