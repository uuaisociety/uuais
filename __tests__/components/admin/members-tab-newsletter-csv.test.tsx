import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MembersTab from '@/components/pages/admin/tabs/membersTab';

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}));

const mockListUsers = jest.fn();
jest.mock('@/lib/firestore', () => ({
  listUsers: () => mockListUsers(),
  listCvs: jest.fn().mockResolvedValue([]),
  updateUserProfile: jest.fn(),
}));

describe('MembersTab newsletter CSV', () => {
  let blobs: Blob[];

  beforeEach(() => {
    blobs = [];
    global.URL.createObjectURL = jest.fn((b: Blob) => {
      blobs.push(b);
      return 'blob:test';
    });
    global.URL.revokeObjectURL = jest.fn();
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  it('exports only subscribed members with an email', async () => {
    mockListUsers.mockResolvedValue([
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
    render(<MembersTab />);
    await waitFor(() =>
      expect(screen.getByText('ada@example.com')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /newsletter csv/i }));

    expect(blobs).toHaveLength(1);
    const csv = await blobs[0].text();
    expect(csv.split('\n')).toEqual([
      '"name","email"',
      '"Ada","ada@example.com"',
      '"Bo ""B""","bo@example.com"',
    ]);
  });
});
