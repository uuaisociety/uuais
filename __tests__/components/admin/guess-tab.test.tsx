import { fireEvent, render, screen, within } from '@testing-library/react';
import GuessTab from '@/components/pages/admin/tabs/GuessTab';

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}));
jest.mock('@/lib/firestore/useGuessContest', () => ({
  useGuessContest: () => ({
    contest: { item: 'candy', open: true },
    loaded: true,
  }),
}));
jest.mock('@/lib/firestore/guess-contest', () => ({
  MAX_GUESS_DIGITS: 9,
  saveGuessContest: jest.fn(),
  // Named so the global useCollectionData mock can key its data on it.
  subscribeGuesses: function subscribeGuesses() {},
}));

const at = (minute: number) => new Date(2026, 10, 7, 12, minute);

describe('GuessTab', () => {
  beforeEach(() => {
    global.__setCollectionData?.({
      subscribeGuesses: {
        loaded: true,
        data: [
          { id: 'a', email: 'far@example.com', guess: 10, updatedAt: at(1) },
          { id: 'b', email: 'late@example.com', guess: 95, updatedAt: at(3) },
          { id: 'c', email: 'early@example.com', guess: 105, updatedAt: at(2) },
        ],
      },
    });
  });
  afterEach(() => global.__setCollectionData?.(null));

  const emails = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getByRole('link').textContent);

  it('lists the newest guesses first', () => {
    render(<GuessTab />);
    expect(emails()).toEqual([
      'late@example.com',
      'early@example.com',
      'far@example.com',
    ]);
  });

  it('ranks by closeness to the correct amount, earlier guess winning a tie', () => {
    render(<GuessTab />);
    fireEvent.change(screen.getByLabelText(/Correct amount/), {
      target: { value: '100' },
    });
    expect(emails()).toEqual([
      'early@example.com',
      'late@example.com',
      'far@example.com',
    ]);
  });
});
