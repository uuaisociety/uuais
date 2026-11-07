import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuessPage from '@/components/pages/GuessPage';

const mockUseAdmin = jest.fn();
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: (...args: unknown[]) => mockUseAdmin(...args),
}));

const mockUseGuessContest = jest.fn();
jest.mock('@/lib/firestore/useGuessContest', () => ({
  useGuessContest: () => mockUseGuessContest(),
}));

const mockGetMyGuess = jest.fn();
const mockSubmitGuess = jest.fn();
jest.mock('@/lib/firestore/guess-contest', () => ({
  MAX_GUESS_DIGITS: 9,
  getMyGuess: (...args: unknown[]) => mockGetMyGuess(...args),
  submitGuess: (...args: unknown[]) => mockSubmitGuess(...args),
}));

const signedIn = { uid: 'u1', email: 'member@example.com' };

describe('GuessPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdmin.mockReturnValue({ user: signedIn, loading: false });
    mockUseGuessContest.mockReturnValue({
      contest: { item: 'candy in the jar', open: true },
      loaded: true,
    });
    mockGetMyGuess.mockResolvedValue(null);
    mockSubmitGuess.mockResolvedValue(undefined);
  });

  it('names what to guess in the heading', () => {
    render(<GuessPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Guess the amount of (candy in the jar)',
    );
  });

  it('says so when the game is closed', () => {
    mockUseGuessContest.mockReturnValue({
      contest: { item: 'candy', open: false },
      loaded: true,
    });
    render(<GuessPage />);
    expect(screen.getByText(/isn.t open right now/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Your guess')).not.toBeInTheDocument();
  });

  it('asks signed-out visitors to log in and returns them here', () => {
    mockUseAdmin.mockReturnValue({ user: null, loading: false });
    render(<GuessPage />);
    expect(screen.queryByLabelText('Your guess')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fguess',
    );
  });

  it('only accepts digits in the guess box', () => {
    render(<GuessPage />);
    const input = screen.getByLabelText('Your guess');
    fireEvent.change(input, { target: { value: '1a2-3.4e' } });
    expect(input).toHaveValue('1234');
  });

  it('saves the guess as a number with the account email', async () => {
    render(<GuessPage />);
    fireEvent.change(screen.getByLabelText('Your guess'), {
      target: { value: '0123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit guess' }));
    await waitFor(() =>
      expect(mockSubmitGuess).toHaveBeenCalledWith(
        'u1',
        'member@example.com',
        123,
      ),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your guess of 123 is saved for member@example.com',
    );
  });

  it('prefills an earlier guess so it can be changed', async () => {
    mockGetMyGuess.mockResolvedValue(77);
    render(<GuessPage />);
    await waitFor(() =>
      expect(screen.getByLabelText('Your guess')).toHaveValue('77'),
    );
    expect(
      screen.getByRole('button', { name: 'Update guess' }),
    ).toBeInTheDocument();
  });
});
