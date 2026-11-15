import { render, screen } from '@testing-library/react';
import EmailLinkSignIn from '@/components/auth/EmailLinkSignIn';

// The Firebase SDK chunk fails to load (a bad connection while opening the emailed link).
jest.mock('@/lib/firebase-client', () => {
  throw new Error('Loading chunk failed');
});

describe('EmailLinkSignIn when the SDK cannot load', () => {
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    window.history.replaceState(
      {},
      '',
      '/join?apiKey=k&oobCode=abc&mode=signIn',
    );
  });
  afterEach(() => {
    errorSpy.mockRestore();
    window.history.replaceState({}, '', '/');
  });

  it('leaves the spinner for the confirm step with a connection message', async () => {
    render(
      <EmailLinkSignIn
        label="Email"
        placeholder="you@example.com"
        contactEmail="contact@uuais.com"
        onSignedIn={jest.fn()}
      />,
    );
    expect(
      await screen.findByText(/couldn’t reach the sign-in service/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Signing you in…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
