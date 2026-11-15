import { render, screen, within } from '@testing-library/react';
import { JoinSkeleton } from '@/components/pages/JoinLayout';
import { NewsletterSkeleton } from '@/components/pages/NewsletterPage';
import { GuessSkeleton } from '@/components/pages/GuessPage';
import { TeamApplicationSkeleton } from '@/components/pages/TeamApplicationSkeleton';
import { LoginSkeleton } from '@/components/auth/LoginLayout';

jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({}),
  refreshProfile: jest.fn(),
  ensureAuth: jest.fn(),
  publishProfile: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
}));
jest.mock('@/lib/firestore/useGuessContest', () => ({
  useGuessContest: () => ({ contest: null, loaded: false }),
}));
jest.mock('@/lib/firestore/guess-contest', () => ({
  MAX_GUESS_DIGITS: 9,
  getMyGuess: jest.fn(),
  submitGuess: jest.fn(),
}));

// Skeletons hold no working controls: placeholders, or the page's own controls made inert.
const expectNoLiveButtons = (container: HTMLElement) => {
  for (const button of within(container).queryAllByRole('button'))
    expect(button.closest('[inert]')).not.toBeNull();
};

describe('LoginSkeleton', () => {
  it('shows the sign-in heading and email label with a short status', () => {
    const { container } = render(<LoginSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading sign-in…');
    expect(
      screen.getByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    expectNoLiveButtons(container);
  });
});

describe('JoinSkeleton', () => {
  it('shows the sign-in step for a new visitor', () => {
    const { container } = render(<JoinSkeleton cached={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(
      screen.getByRole('heading', { name: 'Join UU AI Society' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expectNoLiveButtons(container);
  });

  it('shows the details step, with the address, for a returning visitor', () => {
    render(<JoinSkeleton cached={{ email: 'ada@example.com' }} />);
    expect(screen.getByText('A few details about you')).toBeInTheDocument();
    expect(
      screen.getByText(/Signed in as ada@example.com/),
    ).toBeInTheDocument();
    for (const label of [
      'Your name',
      'I am a',
      'Programme / major',
      'How did you hear about us?',
    ])
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('NewsletterSkeleton', () => {
  it('shows the sign-in prompt when nobody was signed in', () => {
    const { container } = render(<NewsletterSkeleton cached={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your account…',
    );
    expect(
      screen.getByRole('heading', { name: 'Newsletter' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Log in with your member account/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Log in' }).closest('[inert]'),
    ).not.toBeNull();
    expectNoLiveButtons(container);
  });

  it('shows the member panel with the cached address', () => {
    render(<NewsletterSkeleton cached={{ email: 'ada@example.com' }} />);
    expect(screen.getByText('Account:')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });
});

describe('GuessSkeleton', () => {
  it('shows the guess form for someone signed in before', () => {
    const { container } = render(<GuessSkeleton signedIn />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Guess the amount of',
    );
    expect(screen.getByText('Your guess')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expectNoLiveButtons(container);
  });

  it('shows the sign-in prompt otherwise', () => {
    render(<GuessSkeleton signedIn={false} />);
    expect(
      screen.getByText('Log in to submit your guess.'),
    ).toBeInTheDocument();
  });
});

describe('TeamApplicationSkeleton', () => {
  it('shows the overview step with the real step bar and copy', () => {
    const { container } = render(<TeamApplicationSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading campaigns…');
    expect(screen.getByText("Who we're looking for")).toBeInTheDocument();
    expect(screen.getByText('Open Roles')).toBeInTheDocument();
    for (const step of [
      'Overview',
      'Your Profile',
      'Experience',
      'Role Selection',
      'Review',
    ])
      expect(screen.getByText(step)).toBeInTheDocument();
    expect(screen.getByText(/Application deadline:/)).toBeInTheDocument();
    expectNoLiveButtons(container);
  });

  it('takes a route label', () => {
    render(<TeamApplicationSkeleton label="Loading…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
