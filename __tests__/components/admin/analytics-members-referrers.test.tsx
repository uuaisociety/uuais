import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AnalyticsMembersTab from '@/components/pages/admin/tabs/analytics/AnalyticsMembersTab';
import type { MemberAnalytics } from '@/lib/firestore/member-analytics';

const analytics = (
  referrers: MemberAnalytics['referrers'],
): MemberAnalytics => ({
  totalUsers: 10,
  marketingOptIn: 0,
  partnerContactOptIn: 0,
  analyticsOptIn: 0,
  lookingForJob: 0,
  newsletter: 0,
  sharedCvs: 0,
  heardOfUs: {},
  referrers,
  gender: {},
  studentStatus: {},
  monthlySignups: [],
});

const renderTab = (referrers: MemberAnalytics['referrers']) =>
  render(
    <AnalyticsMembersTab
      memberAnalytics={analytics(referrers)}
      chartData={[]}
      eventMarkers={[]}
    />,
  );

describe('Members analytics: top referrers', () => {
  it('ranks referrers, with ties sharing a place', () => {
    renderTab([
      { name: 'Ada', count: 3 },
      { name: 'Bo', count: 2 },
      { name: 'Cy', count: 2 },
      { name: 'Di', count: 1 },
    ]);
    expect(screen.getByText('8 referrals · 4 referrers')).toBeInTheDocument();
    const rows = within(
      screen.getByText('Top referrers').closest('div')!.parentElement!,
    ).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      '1Ada3',
      '2Bo2',
      '2Cy2',
      '4Di1',
    ]);
  });

  it('shows the top 10 only', () => {
    renderTab(
      Array.from({ length: 12 }, (_, i) => ({ name: `P${i}`, count: 12 - i })),
    );
    expect(screen.getByText('P9')).toBeInTheDocument();
    expect(screen.queryByText('P10')).not.toBeInTheDocument();
  });

  it('says so when nobody has been referred', () => {
    renderTab([]);
    expect(screen.getByText('No referrals yet')).toBeInTheDocument();
    expect(screen.getByText('0 referrals · 0 referrers')).toBeInTheDocument();
  });
});
