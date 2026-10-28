import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UseDifferentEmailButton from '@/components/auth/UseDifferentEmailButton';

const mockLogout = jest.fn();
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({ logout: mockLogout }),
}));

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe('UseDifferentEmailButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('signs out, then re-renders the page so the email sign-in shows again', async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<UseDifferentEmailButton />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Use a different email' }),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockLogout.mock.invocationCallOrder[0]).toBeLessThan(
      mockRefresh.mock.invocationCallOrder[0],
    );
  });
});
