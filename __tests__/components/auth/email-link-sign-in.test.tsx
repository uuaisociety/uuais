import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailLinkSignIn from '@/components/auth/EmailLinkSignIn';

// Partner-specific behaviour (allowlist, link completion) is covered in
// partner-email-sign-in.test.tsx; these cover the guards on the daily email quota.

const mockSendEmailSignInLink = jest.fn();
const mockCooldownSeconds = jest.fn();
jest.mock('@/lib/firebase-client', () => ({
  emailLinkCooldownSeconds: () => mockCooldownSeconds(),
  sendEmailSignInLink: (...args: unknown[]) => mockSendEmailSignInLink(...args),
  isEmailSignInLink: () => false,
  storedEmailForSignIn: () => null,
  signInWithEmailLinkAfterReady: jest.fn(),
}));

const requestLink = async () => {
  await userEvent.type(screen.getByLabelText('Email'), 'ada@student.uu.se');
  await userEvent.click(
    screen.getByRole('button', { name: 'Email me a sign-in link' }),
  );
};

describe('EmailLinkSignIn', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCooldownSeconds.mockReturnValue(0);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => errorSpy.mockRestore());

  const renderForm = (alternative?: string) =>
    render(
      <EmailLinkSignIn
        label="Email"
        placeholder="you@example.com"
        contactEmail="contact@uuais.com"
        alternative={alternative}
        onSignedIn={jest.fn()}
      />,
    );

  it('sends no second link from the same browser within the cooldown', async () => {
    mockCooldownSeconds.mockReturnValue(42);
    renderForm();

    await requestLink();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A sign-in link was just sent. Please wait 42 seconds before requesting another.',
    );
    expect(mockSendEmailSignInLink).not.toHaveBeenCalled();
  });

  it('explains when Firebase throttles sign-in emails', async () => {
    mockSendEmailSignInLink.mockRejectedValue(
      Object.assign(new Error('Firebase: Error (auth/too-many-requests).'), {
        code: 'auth/too-many-requests',
      }),
    );
    renderForm();

    await requestLink();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many sign-in attempts. Please wait a few minutes and try again.',
    );
  });

  it('names the member contact when email sign-in is switched off', async () => {
    mockSendEmailSignInLink.mockRejectedValue(
      Object.assign(new Error('off'), { code: 'auth/operation-not-allowed' }),
    );
    renderForm();

    await requestLink();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please contact contact@uuais.com.',
    );
  });

  it.each(['auth/captcha-check-failed', 'auth/missing-recaptcha-token'])(
    'offers another way in when reCAPTCHA refuses the request (%s)',
    async (code) => {
      mockSendEmailSignInLink.mockRejectedValue(
        Object.assign(new Error(code), { code }),
      );
      renderForm('continue with Google or GitHub');

      await requestLink();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'We couldn’t verify this request. Try again without a VPN or in another browser, or continue with Google or GitHub.',
      );
    },
  );

  it('points to the contact address when no other way in is given', async () => {
    mockSendEmailSignInLink.mockRejectedValue(
      Object.assign(new Error('blocked'), {
        code: 'auth/captcha-check-failed',
      }),
    );
    renderForm();

    await requestLink();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /in another browser, or contact contact@uuais\.com\.$/,
    );
  });
});
