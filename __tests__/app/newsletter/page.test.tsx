import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode } from 'react';
import NewsletterPage from '@/components/pages/NewsletterPage';

const mockUseAdmin = jest.fn();
const mockRefreshProfile = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: (...args: unknown[]) => mockUseAdmin(...args),
  refreshProfile: () => mockRefreshProfile(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
}));

describe('NewsletterPage', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    mockRefreshProfile.mockResolvedValue(undefined);
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: null,
      profile: null,
    });
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('shows loading while account state is unresolved', () => {
    mockUseAdmin.mockReturnValue({
      loading: true,
      profileLoading: false,
      user: null,
      profile: null,
    });
    render(<NewsletterPage />);
    expect(mockUseAdmin).toHaveBeenCalledWith({ eager: true });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your account',
    );
  });

  it('prompts anonymous visitors to log in or join with a newsletter return path', () => {
    render(<NewsletterPage />);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fnewsletter',
    );
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute('href', '/join?redirect=%2Fnewsletter');
  });

  it.each([true, false])(
    'automatically saves the requested %s preference once for a ready member',
    async (requestedSubscription) => {
      mockUseAdmin.mockReturnValue({
        loading: false,
        profileLoading: false,
        user: { uid: 'u1' },
        profile: {
          isMember: true,
          privacyAcceptedAt: 'accepted',
          newsletter: !requestedSubscription,
        },
      });
      const view = render(
        <StrictMode>
          <NewsletterPage requestedSubscription={requestedSubscription} />
        </StrictMode>,
      );
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/newsletter',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ newsletter: requestedSubscription }),
        }),
      );
      await waitFor(() =>
        expect(mockRouterReplace).toHaveBeenCalledWith('/newsletter', {
          scroll: false,
        }),
      );
      expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
      view.rerender(
        <StrictMode>
          <NewsletterPage requestedSubscription={requestedSubscription} />
        </StrictMode>,
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('allows the same preference to be requested again after the query is cleared', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    const view = render(<NewsletterPage requestedSubscription />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    view.rerender(<NewsletterPage requestedSubscription={null} />);
    view.rerender(<NewsletterPage requestedSubscription />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it('allows a changed preference and then the original preference again', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    const view = render(<NewsletterPage requestedSubscription />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    view.rerender(<NewsletterPage requestedSubscription={false} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    view.rerender(<NewsletterPage requestedSubscription />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
  });

  it('does not let an older save clear a newer preference request', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    const resolvers: Array<(response: { ok: boolean }) => void> = [];
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve)),
    );
    const view = render(<NewsletterPage requestedSubscription />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    view.rerender(<NewsletterPage requestedSubscription={false} />);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolvers[0]({ ok: true }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/newsletter',
      expect.objectContaining({
        body: JSON.stringify({ newsletter: false }),
      }),
    );
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(
      screen.queryByText('You are subscribed to the newsletter.'),
    ).not.toBeInTheDocument();

    await act(async () => resolvers[1]({ ok: true }));
    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith('/newsletter', {
        scroll: false,
      }),
    );
    expect(mockRouterReplace).toHaveBeenCalledTimes(1);
  });

  it('waits for live auth and completed membership before saving', async () => {
    const state = {
      loading: true,
      profileLoading: false,
      user: null as { uid: string } | null,
      profile: null as Record<string, unknown> | null,
    };
    mockUseAdmin.mockReturnValue(state);
    const view = render(<NewsletterPage requestedSubscription />);
    expect(global.fetch).not.toHaveBeenCalled();

    state.loading = false;
    state.user = { uid: 'u1' };
    state.profileLoading = true;
    view.rerender(<NewsletterPage requestedSubscription />);
    expect(global.fetch).not.toHaveBeenCalled();

    state.profileLoading = false;
    state.profile = { isMember: true };
    view.rerender(<NewsletterPage requestedSubscription />);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole('link', { name: 'Complete membership' }),
    ).toHaveAttribute(
      'href',
      '/join?redirect=%2Fnewsletter%3Fsubscribe%3Dtrue',
    );

    state.profile = { isMember: true, privacyAcceptedAt: 'accepted' };
    view.rerender(<NewsletterPage requestedSubscription />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it.each([true, false])(
    'preserves subscribe=%s through login and join redirects',
    (requestedSubscription) => {
      render(<NewsletterPage requestedSubscription={requestedSubscription} />);
      expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
        'href',
        `/login?redirect=${encodeURIComponent(`/newsletter?subscribe=${requestedSubscription}`)}`,
      );
      expect(
        screen.getByRole('link', { name: 'Create an account' }),
      ).toHaveAttribute(
        'href',
        `/join?redirect=${encodeURIComponent(`/newsletter?subscribe=${requestedSubscription}`)}`,
      );
    },
  );

  it('does not repeat a failed automatic save after rerenders', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const view = render(<NewsletterPage requestedSubscription />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not update your subscription',
    );
    view.rerender(<NewsletterPage requestedSubscription />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('clears a failed automatic request after a successful manual retry', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({ ok: true });
    render(<NewsletterPage requestedSubscription />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not update your subscription',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith('/newsletter', {
        scroll: false,
      }),
    );
  });

  it('keeps absent preference requests inert and manual controls available', () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    render(<NewsletterPage />);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled();
  });

  it.each([true, false])(
    'preserves subscribe=%s when directing incomplete members to registration',
    (requestedSubscription) => {
      mockUseAdmin.mockReturnValue({
        loading: false,
        profileLoading: false,
        user: { uid: 'u1' },
        profile: { isMember: true },
      });
      render(<NewsletterPage requestedSubscription={requestedSubscription} />);
      expect(
        screen.getByRole('link', { name: 'Complete membership' }),
      ).toHaveAttribute(
        'href',
        `/join?redirect=${encodeURIComponent(`/newsletter?subscribe=${requestedSubscription}`)}`,
      );
    },
  );

  it('allows subscribing when the newsletter flag is missing', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: {
        isMember: true,
        privacyAcceptedAt: 'accepted',
        email: 'ada@example.com',
      },
    });
    render(<NewsletterPage />);
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/newsletter',
        expect.objectContaining({ body: '{"newsletter":true}' }),
      ),
    );
    expect(mockRefreshProfile).toHaveBeenCalled();
    expect(
      await screen.findByText('You are subscribed to the newsletter.'),
    ).toBeInTheDocument();
  });

  it('supports unsubscribe and resubscribe using the refreshed profile state', async () => {
    const state = {
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: {
        isMember: true,
        privacyAcceptedAt: 'accepted',
        newsletter: true,
      },
    };
    mockUseAdmin.mockReturnValue(state);
    const { rerender } = render(<NewsletterPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Unsubscribe' }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/newsletter',
        expect.objectContaining({ body: '{"newsletter":false}' }),
      ),
    );
    state.profile.newsletter = false;
    rerender(<NewsletterPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/newsletter',
        expect.objectContaining({ body: '{"newsletter":true}' }),
      ),
    );
  });

  it('keeps the current status on save failure and reports the error', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    render(<NewsletterPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not update your subscription',
    );
    expect(
      screen.getByText('You are currently unsubscribed.'),
    ).toBeInTheDocument();
    expect(mockRefreshProfile).not.toHaveBeenCalled();
  });

  it('prevents a second action while a save is pending', async () => {
    mockUseAdmin.mockReturnValue({
      loading: false,
      profileLoading: false,
      user: { uid: 'u1' },
      profile: { isMember: true, privacyAcceptedAt: 'accepted' },
    });
    let finish!: (value: { ok: boolean }) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<NewsletterPage />);
    const button = screen.getByRole('button', { name: 'Subscribe' });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(
      screen.getByText('You are currently unsubscribed.'),
    ).toBeInTheDocument();
    fireEvent.click(button);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    finish({ ok: true });
    await waitFor(() => expect(button).toBeEnabled());
  });
});
