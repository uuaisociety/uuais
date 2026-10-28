import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CvCard from '@/components/account/CvCard';

const mockGetMyCv = jest.fn();
jest.mock('@/lib/firestore', () => ({
  getMyCv: (...args: unknown[]) => mockGetMyCv(...args),
}));

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}));

const storedCv = {
  id: 'user1',
  path: 'cvs/user1/cv.pdf',
  fileName: 'Alex CV.pdf',
  size: 420_000,
  uploadedAt: '2026-10-28T10:00:00.000Z',
  consentAt: '2026-10-28T10:00:00.000Z',
  consentVersion: '2026-10-28',
};

describe('CvCard', () => {
  beforeEach(() => {
    mockGetMyCv.mockReset();
  });

  it('keeps sharing disabled until a file is chosen and consent is ticked', async () => {
    mockGetMyCv.mockResolvedValue(null);
    render(<CvCard uid="user1" isMember emailVerified />);

    const share = await screen.findByRole('button', { name: 'Share CV' });
    const consent = screen.getByRole('checkbox');
    expect(consent).not.toBeChecked();
    expect(share).toBeDisabled();

    fireEvent.click(consent);
    expect(share).toBeDisabled();

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' })],
      },
    });
    expect(share).toBeEnabled();
  });

  it('shows the stored CV with replace and withdraw actions', async () => {
    mockGetMyCv.mockResolvedValue(storedCv);
    const onCvChange = jest.fn();
    render(
      <CvCard uid="user1" isMember emailVerified onCvChange={onCvChange} />,
    );
    await waitFor(() => expect(onCvChange).toHaveBeenCalledWith(storedCv));

    expect(await screen.findByText('Alex CV.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove and withdraw consent' }),
    ).toBeInTheDocument();
  });

  it('offers a retry instead of the upload form when loading fails', async () => {
    mockGetMyCv
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(storedCv);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<CvCard uid="user1" isMember emailVerified />);

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(await screen.findByText('Alex CV.pdf')).toBeInTheDocument();
    warn.mockRestore();
  });

  it('asks for a verified email instead of showing the upload form', async () => {
    mockGetMyCv.mockResolvedValue(null);
    render(<CvCard uid="user1" isMember emailVerified={false} />);
    expect(
      await screen.findByText(/email needs to be verified/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('points non-members to membership instead of the upload form', async () => {
    mockGetMyCv.mockResolvedValue(null);
    render(<CvCard uid="user1" isMember={false} emailVerified />);

    expect(
      await screen.findByRole('link', { name: 'Complete your membership' }),
    ).toHaveAttribute('href', '/join');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
