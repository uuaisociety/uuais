import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PartnerEmailSignIn from '@/components/auth/PartnerEmailSignIn';

const mockSendEmailSignInLink = jest.fn();
const mockIsEmailSignInLink = jest.fn();
const mockStoredEmailForSignIn = jest.fn();
const mockSignInWithEmailLink = jest.fn();
jest.mock('@/lib/firebase-client', () => ({
  sendEmailSignInLink: (...args: unknown[]) => mockSendEmailSignInLink(...args),
  isEmailSignInLink: (...args: unknown[]) => mockIsEmailSignInLink(...args),
  storedEmailForSignIn: () => mockStoredEmailForSignIn(),
  signInWithEmailLinkAfterReady: (...args: unknown[]) =>
    mockSignInWithEmailLink(...args),
}));

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

const fbError = (code: string) =>
  Object.assign(new Error(`Firebase: Error (${code}).`), { code });
const LINK = '/partners/cvs?apiKey=k&oobCode=abc&mode=signIn';
const user = { uid: 'p1' };

// The pre-send allowlist check (/api/partners/check-email).
const mockFetch = jest.fn();
const approvedResponse = (approved: boolean) =>
  Promise.resolve({ ok: true, json: async () => ({ approved }) });

describe('PartnerEmailSignIn', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEmailSignInLink.mockReturnValue(false);
    mockStoredEmailForSignIn.mockReturnValue(null);
    window.history.replaceState({}, '', '/partners/cvs');
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockImplementation(() => approvedResponse(true));
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => errorSpy.mockRestore());

  it('emails a link that returns to the partner page', async () => {
    mockSendEmailSignInLink.mockResolvedValue(undefined);
    render(<PartnerEmailSignIn />);

    await userEvent.type(
      screen.getByLabelText('Work email'),
      ' hr@partner.example ',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a sign-in link' }),
    );

    expect(mockSendEmailSignInLink).toHaveBeenCalledWith(
      'hr@partner.example',
      `${window.location.origin}/partners/cvs`,
    );
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    expect(
      screen.getByText(/sent a sign-in link to hr@partner.example/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/check your spam folder for an email from/),
    ).toHaveTextContent('noreply@uuais.com');
  });

  it('sends nothing to an address that is neither a partner nor an admin', async () => {
    mockFetch.mockImplementation(() => approvedResponse(false));
    render(<PartnerEmailSignIn />);

    await userEvent.type(
      screen.getByLabelText('Work email'),
      'someone@example.com',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a sign-in link' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your email was not found among our approved partnerships.',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/partners/check-email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'someone@example.com' }),
      }),
    );
    expect(mockSendEmailSignInLink).not.toHaveBeenCalled();
    expect(screen.queryByText('Check your inbox')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/We sent a sign-in link/),
    ).not.toBeInTheDocument();
    // The form stays, so they can try a different email.
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
  });

  it('shows the check’s own error, e.g. when rate-limited', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({
          error: 'Too many attempts. Please try again in a few minutes.',
        }),
      }),
    );
    render(<PartnerEmailSignIn />);

    await userEvent.type(
      screen.getByLabelText('Work email'),
      'hr@partner.example',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a sign-in link' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Please try again in a few minutes.',
    );
    expect(mockSendEmailSignInLink).not.toHaveBeenCalled();
  });

  it('explains when email sign-in is not enabled in Firebase', async () => {
    mockSendEmailSignInLink.mockRejectedValue(
      fbError('auth/operation-not-allowed'),
    );
    render(<PartnerEmailSignIn />);

    await userEvent.type(
      screen.getByLabelText('Work email'),
      'hr@partner.example',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Email me a sign-in link' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Email sign-in isn’t available right now/,
    );
  });

  it('finishes the sign-in on the requesting browser and reloads the page with the session', async () => {
    window.history.replaceState({}, '', LINK);
    mockIsEmailSignInLink.mockReturnValue(true);
    mockStoredEmailForSignIn.mockReturnValue('hr@partner.example');
    mockSignInWithEmailLink.mockResolvedValue(user);
    render(<PartnerEmailSignIn />);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(mockSignInWithEmailLink).toHaveBeenCalledWith(
      'hr@partner.example',
      window.location.href,
    );
    expect(mockReplace).toHaveBeenCalledWith('/partners/cvs');
  });

  it('uses a single-use link only once, even when effects run twice', async () => {
    window.history.replaceState({}, '', LINK);
    mockIsEmailSignInLink.mockReturnValue(true);
    mockStoredEmailForSignIn.mockReturnValue('hr@partner.example');
    mockSignInWithEmailLink.mockResolvedValue(user);
    render(
      <React.StrictMode>
        <PartnerEmailSignIn />
      </React.StrictMode>,
    );

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockSignInWithEmailLink).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks another device to confirm the email, and keeps the link on a mismatch', async () => {
    window.history.replaceState({}, '', LINK);
    mockIsEmailSignInLink.mockReturnValue(true);
    mockSignInWithEmailLink
      .mockRejectedValueOnce(fbError('auth/invalid-email'))
      .mockResolvedValueOnce(user);
    render(<PartnerEmailSignIn />);

    expect(
      await screen.findByText(/opened the link on a different device/),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText('Work email'),
      'wrong@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email doesn’t match the one the link was sent to.',
    );
    expect(window.location.search).toContain('oobCode=abc');

    await userEvent.clear(screen.getByLabelText('Work email'));
    await userEvent.type(
      screen.getByLabelText('Work email'),
      'hr@partner.example',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it('drops an expired link and offers a new one', async () => {
    window.history.replaceState({}, '', LINK);
    mockIsEmailSignInLink.mockReturnValue(true);
    mockStoredEmailForSignIn.mockReturnValue('hr@partner.example');
    mockSignInWithEmailLink.mockRejectedValue(
      fbError('auth/invalid-action-code'),
    );
    render(<PartnerEmailSignIn />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /expired or was already used/,
    );
    expect(
      screen.getByRole('button', { name: 'Email me a sign-in link' }),
    ).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(
      '/partners/cvs',
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
