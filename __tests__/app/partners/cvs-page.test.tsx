import { render, screen, within } from '@testing-library/react';
import Page from '@/app/partners/cvs/page';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const mockGetServerSession = jest.fn();
jest.mock('@/lib/server-auth', () => ({
  getServerSession: () => mockGetServerSession(),
}));
// The allowlist check itself is covered by the /api/cvs tests.
jest.mock('@/lib/partner-access', () => ({
  canReviewCvs: async (s: { isAdmin?: boolean; isPartner?: boolean } | null) =>
    Boolean(s && (s.isAdmin || s.isPartner)),
}));

jest.mock('@/components/auth/UseDifferentEmailButton', () => ({
  __esModule: true,
  default: () => <button>Use a different email</button>,
}));
// The email-link form has its own tests; here it only needs to appear.
jest.mock('@/components/auth/PartnerEmailSignIn', () => ({
  __esModule: true,
  default: () => <div>partner email sign-in</div>,
}));

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));
jest.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }),
}));

let cvDocs: { id: string; consentAt: string }[];
let profiles: Record<string, Record<string, unknown>>;
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      get: async () => ({
        empty: cvDocs.length === 0,
        docs: cvDocs.map((d) => ({
          id: d.id,
          get: (k: string) => (k === 'consentAt' ? d.consentAt : undefined),
        })),
      }),
      doc: (id: string) => ({ id, collection: name }),
    }),
    getAll: async (...refs: { id: string }[]) =>
      refs.map((r) => ({
        id: r.id,
        get: (k: string) => profiles[r.id]?.[k],
      })),
  },
}));

const session = (claims: Record<string, boolean>) => ({
  uid: 'viewer',
  isAdmin: false,
  isSuperAdmin: false,
  isPartner: false,
  ...claims,
});

describe('/partners/cvs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    cvDocs = [
      { id: 'u2', consentAt: '2026-10-20T10:00:00.000Z' },
      { id: 'u1', consentAt: '2026-10-28T10:00:00.000Z' },
    ];
    profiles = {
      u1: {
        name: 'Anna Svensson',
        email: 'anna@student.uu.se',
        program: 'Computer Science',
        expectedGraduationYear: 2027,
        isMember: true,
      },
      u2: { name: 'Åsa Öberg', isMember: true },
    };
  });

  it('offers signed-out visitors the partner email sign-in, not the member login', async () => {
    mockGetServerSession.mockResolvedValue(null);
    render(await Page());
    expect(screen.getByText('partner email sign-in')).toBeInTheDocument();
    expect(screen.getByText(/one-time sign-in link/)).toBeInTheDocument();
    expect(screen.queryByText('Anna Svensson')).not.toBeInTheDocument();
  });

  it('shows no CVs to a signed-in member without a partner or admin role', async () => {
    mockGetServerSession.mockResolvedValue(session({}));
    render(await Page());
    expect(
      screen.getByText(/not found among our approved partnerships/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Anna Svensson')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Use a different email' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['partner', { isPartner: true }],
    ['admin', { isAdmin: true }],
  ])('lists shared CVs by name for a %s', async (_, claims) => {
    mockGetServerSession.mockResolvedValue(session(claims));
    render(await Page());

    const rows = screen.getAllByRole('listitem');
    expect(
      rows.map((r) => within(r).getByText(/Svensson|Öberg/).textContent),
    ).toEqual(['Anna Svensson', 'Åsa Öberg']);
    expect(
      screen.getByRole('link', { name: "Download Anna Svensson's CV" }),
    ).toHaveAttribute('href', '/api/cvs?uid=u1');
    expect(screen.getByText('2 CVs')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'anna@student.uu.se' }),
    ).toHaveAttribute('href', 'mailto:anna@student.uu.se');
    expect(screen.getAllByText('Computer Science').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2027/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'Download all (2)' }),
    ).toBeInTheDocument();
  });

  it('lists only current members, with spoofing characters and oversized text cleaned', async () => {
    mockGetServerSession.mockResolvedValue(session({ isPartner: true }));
    cvDocs.push({ id: 'u3', consentAt: '2026-10-01T00:00:00.000Z' });
    profiles.u3 = { name: 'Revoked Member', isMember: false };
    profiles.u1.name = 'Anna \u202eSvensson';
    profiles.u1.program = 'x'.repeat(5000);
    render(await Page());

    expect(screen.queryByText('Revoked Member')).not.toBeInTheDocument();
    expect(screen.getByText('Anna Svensson')).toBeInTheDocument();
    expect(screen.getByText('2 CVs')).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).toContain('x'.repeat(150));
    expect(text).not.toContain('x'.repeat(151));
    // Partners see member details here, so the view itself is logged.
    expect(mockLog).toHaveBeenCalledWith({
      action: 'view',
      adminUid: 'viewer',
      count: 2,
      ip: '1.2.3.4',
      role: 'partner',
      email: undefined,
    });
  });

  it('stops logging a partner’s reloads past the hourly limit, still showing the list', async () => {
    mockGetServerSession.mockResolvedValue(session({ isPartner: true }));
    for (let i = 0; i < 31; i++) await Page();
    expect(mockLog).toHaveBeenCalledTimes(30);
    render(await Page());
    expect(screen.getByText('2 CVs')).toBeInTheDocument();
  });

  it('does not log an admin opening the list', async () => {
    mockGetServerSession.mockResolvedValue(session({ isAdmin: true }));
    render(await Page());
    expect(screen.getByText('2 CVs')).toBeInTheDocument();
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('says so when nobody has shared a CV', async () => {
    mockGetServerSession.mockResolvedValue(session({ isPartner: true }));
    cvDocs = [];
    render(await Page());
    expect(
      screen.getByText('No members have shared a CV yet.'),
    ).toBeInTheDocument();
  });
});
