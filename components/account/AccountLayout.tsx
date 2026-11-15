'use client';

// Shared by the account page and its loading skeleton, so the skeleton has the
// page's exact geometry and nothing jumps when the real content arrives.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { HeroSplash } from '@/components/HeroSplash';
import { DISCORD_INVITE } from '@/components/common/DiscordCta';
import { SkeletonRegion, SkeletonText } from '@/components/ui/skeleton';

// The default light splash puts a cool lobe low-left, right behind the tab row;
// here only the warm glow stays, up high, away from the tabs.
export const ACCOUNT_LIGHT_SPLASH =
  'radial-gradient(45rem 26rem at 80% 0%, oklch(from var(--primary) l c h / 16%), transparent 62%)';

// `short` labels let all four tabs fit a phone screen.
export const TABS = [
  { id: 'profile', label: 'Profile', short: 'Profile' },
  { id: 'cv', label: 'CV for partners', short: 'CV' },
  { id: 'events', label: 'Events', short: 'Events' },
  { id: 'settings', label: 'Sign-in & privacy', short: 'Privacy' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

export type FieldKey =
  | 'name'
  | 'displayName'
  | 'studentStatus'
  | 'program'
  | 'expectedGraduationYear'
  | 'university'
  | 'campus'
  | 'gender'
  | 'bio'
  | 'linkedin'
  | 'github'
  | 'website'
  | 'heardOfUs';

export type FieldDef = {
  key: FieldKey;
  label: string;
  hint?: string;
  kind: 'text' | 'url' | 'year' | 'select' | 'textarea' | 'heard';
  /** Matches the Firestore rules' caps where they exist. */
  max?: number;
  options?: [string, string][];
  placeholder?: string;
};

export const HEARD_OF_US: [string, string][] = [
  ['posters', 'Posters'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['friends', 'Friends'],
  ['referral', 'Referral'],
  ['events', 'Events'],
  ['lecture', 'During a lecture'],
  ['other', 'Other'],
];
export const KNOWN_SOURCES = HEARD_OF_US.map(([v]) => v);

export const ABOUT: FieldDef[] = [
  { key: 'name', label: 'Full name', kind: 'text', max: 100 },
  {
    key: 'displayName',
    label: 'Display name',
    hint: 'Shown publicly',
    kind: 'text',
    max: 100,
  },
  {
    key: 'studentStatus',
    label: 'I am a',
    kind: 'select',
    options: [
      ['student', 'Student'],
      ['alumni', 'Alumni'],
      ['other', 'Other'],
    ],
  },
  {
    key: 'program',
    label: 'Programme',
    kind: 'text',
    max: 150,
    placeholder: 'e.g. Computer Science',
  },
  {
    key: 'expectedGraduationYear',
    label: 'Expected graduation',
    kind: 'year',
    placeholder: 'e.g. 2028',
  },
  {
    key: 'university',
    label: 'University',
    kind: 'select',
    options: [
      ['Uppsala', 'Uppsala University'],
      ['other', 'Other'],
      ['none', 'None'],
    ],
  },
  {
    key: 'campus',
    label: 'Campus',
    kind: 'select',
    options: [
      ['Uppsala', 'Uppsala'],
      ['Gotland', 'Gotland'],
      ['other', 'Other'],
    ],
  },
  {
    key: 'gender',
    label: 'Gender',
    kind: 'select',
    options: [
      ['male', 'Male'],
      ['female', 'Female'],
      ['nonbinary', 'Non-binary'],
      ['prefer_not', 'Prefer not to say'],
      ['other', 'Other'],
    ],
  },
  {
    key: 'bio',
    label: 'Bio',
    kind: 'textarea',
    max: 500,
    placeholder: 'A sentence or two about what you’re into',
  },
];

export const LINKS: FieldDef[] = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    kind: 'url',
    max: 200,
    placeholder: 'https://linkedin.com/in/…',
  },
  {
    key: 'github',
    label: 'GitHub',
    kind: 'url',
    max: 200,
    placeholder: 'https://github.com/username',
  },
  {
    key: 'website',
    label: 'Website',
    kind: 'url',
    max: 500,
    placeholder: 'https://example.com',
  },
  { key: 'heardOfUs', label: 'How you found us', kind: 'heard' },
];

// ------------------------------------------------------------------ layout pieces

export const PAGE_CLASS =
  'min-h-screen bg-background pb-24 transition-colors duration-300';
export const PANELS_CLASS = 'max-w-6xl mx-auto px-5 sm:px-8 pt-10';
export const HEADING_CLASS = 'display-lg break-words';

/** Up to two initials for the avatar, from a name or an email address. */
export const initialsOf = (source: string) =>
  source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

export const tabClass = (active: boolean) =>
  `shrink-0 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 pt-3.5 pb-4 text-sm font-medium border-b-2 transition-colors duration-200 ${active ? 'border-primary text-current' : 'border-transparent text-current/60 hover:text-current'}`;

export const TABLIST_CLASS =
  'flex sm:gap-1 overflow-x-auto border-t border-current/10 -mx-2 sm:mx-0';

/** One label / value / action row of the profile list. */
export const ROW_CLASS =
  'grid grid-cols-[1fr_auto] sm:grid-cols-[13rem_1fr_auto] items-center gap-x-6 gap-y-0.5 py-3 border-t border-border';
export const ROW_LABEL_CLASS =
  'text-sm text-muted-foreground col-span-2 sm:col-span-1';
export const ROW_VALUE_CLASS = 'text-foreground font-medium min-w-0';

/** The profile meter's ten segments. */
export const METER_CLASS = 'grid grid-cols-10 gap-1';
export const meterSegmentClass = (filled: boolean) =>
  `h-1.5 rounded-[2px] transition-colors duration-300 ${filled ? 'bg-current' : 'bg-current/15'}`;

/** The meter's label row: "Profile" and the count. */
export const MeterHead = ({ count }: { count: ReactNode }) => (
  <p className="flex items-baseline justify-between mb-2.5 text-current/65">
    <span>Profile</span>
    <span className="mono-meta text-current">{count}</span>
  </p>
);

export const PROFILE_GRID_CLASS =
  'grid lg:grid-cols-[1fr_20rem] lg:grid-rows-[auto_1fr] gap-x-14 gap-y-12';
export const PROFILE_MAIN_CLASS =
  'space-y-10 min-w-0 lg:col-start-1 lg:row-start-1 lg:row-span-2';
export const PROFILE_ASIDE_CLASS = 'lg:col-start-2 lg:row-start-1';
export const PROFILE_AFTER_CLASS = 'lg:col-start-2 lg:row-start-2 self-start';

export const linkClass =
  'underline underline-offset-3 decoration-border hover:decoration-current';

export const SectionHeading = ({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) => (
  <div className="mb-3">
    <h2 className="text-[1.0625rem] font-semibold tracking-[-0.028em] text-foreground">
      {children}
    </h2>
    {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
  </div>
);

export const ABOUT_HINT =
  'Your display name is shown publicly, for example on the referral leaderboard.';

/** The identity band: avatar, name and status on the left, the profile meter on the right, tabs along the bottom. */
export const AccountBand = ({
  avatar,
  heading,
  status,
  meter,
  tabs,
}: {
  avatar: ReactNode;
  heading: ReactNode;
  status: ReactNode;
  meter: ReactNode;
  tabs: ReactNode;
}) => (
  <HeroSplash
    // In light mode the band is near-white on paper; the hairline gives the tabs an edge to sit on.
    className="-mt-14 border-b border-border"
    lightSplash={ACCOUNT_LIGHT_SPLASH}
  >
    <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-28">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 pb-8">
        <div className="flex items-center gap-5 min-w-0">
          <div
            aria-hidden
            className="size-14 sm:size-16 shrink-0 rounded-full border border-current/15 bg-current/[0.05] grid place-items-center text-lg sm:text-xl font-semibold"
          >
            {avatar}
          </div>
          <div className="min-w-0">
            {heading}
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-current/65">
              {status}
            </p>
          </div>
        </div>
        <div className="w-full md:w-72 shrink-0">{meter}</div>
      </div>
      {tabs}
    </div>
  </HeroSplash>
);

export const GetInvolved = () => (
  <div className="border-t border-foreground pt-4">
    <SectionHeading>Get involved</SectionHeading>
    <ul className="text-sm space-y-2.5">
      <li>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          Join our Discord
        </a>{' '}
        <span className="text-muted-foreground">to meet other members</span>
      </li>
      <li>
        <Link href="/events" className={linkClass}>
          Browse upcoming events
        </Link>
      </li>
    </ul>
  </div>
);

// ------------------------------------------------------------------ skeleton

/**
 * The account page while auth and the profile load: the real band, tabs, labels
 * and headings, with bars only where member data goes. A cached name and email
 * (from the last visit) fill in straight away.
 */
export const AccountSkeleton = ({
  cached,
}: {
  cached?: { name: string | null; email: string | null } | null;
}) => {
  const name = cached?.name || cached?.email?.split('@')[0] || '';
  return (
    <SkeletonRegion label="Loading your account…" className={PAGE_CLASS}>
      <AccountBand
        avatar={name ? initialsOf(cached?.name || cached?.email || '') : null}
        heading={
          name ? (
            <h1 className={HEADING_CLASS}>{name}</h1>
          ) : (
            <SkeletonText
              className={HEADING_CLASS}
              widths={['min(18rem, 60vw)']}
            />
          )
        }
        status={
          <>
            <SkeletonText className="font-medium" widths={['4rem']} />
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span className="mono-meta [overflow-wrap:anywhere] basis-full sm:basis-auto">
              {cached?.email ? (
                <>
                  {cached.email}{' '}
                  {/* " · since <date>", which can wrap to its own line */}
                  <SkeletonText className="inline-block" widths={['18ch']} />
                </>
              ) : (
                <SkeletonText className="inline-block" widths={['14rem']} />
              )}
            </span>
          </>
        }
        meter={
          <>
            <MeterHead
              count={
                <SkeletonText className="inline-block" widths={['5rem']} />
              }
            />
            <div aria-hidden className={`${METER_CLASS} animate-pulse`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={meterSegmentClass(false)} />
              ))}
            </div>
            <SkeletonText className="mt-3 text-sm" widths={['75%']} />
          </>
        }
        tabs={
          <div aria-hidden className={TABLIST_CLASS}>
            {TABS.map((t) => (
              <span key={t.id} className={tabClass(t.id === 'profile')}>
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </span>
            ))}
          </div>
        }
      />

      <div className={PANELS_CLASS}>
        <div className={PROFILE_GRID_CLASS}>
          <div className={PROFILE_MAIN_CLASS}>
            {(
              [
                ['About you', ABOUT_HINT, ABOUT],
                ['Links', undefined, LINKS],
              ] as const
            ).map(([title, hint, fields]) => (
              <div key={title}>
                <SectionHeading hint={hint}>{title}</SectionHeading>
                <dl className="border-b border-border">
                  {fields.map((f) => (
                    <div key={f.key} className={ROW_CLASS}>
                      <dt className={ROW_LABEL_CLASS}>
                        {f.label}
                        {f.hint && (
                          <span className="mono-meta ml-2">{f.hint}</span>
                        )}
                      </dt>
                      <dd className={ROW_VALUE_CLASS}>
                        <SkeletonText widths={['min(12rem, 70%)']} />
                      </dd>
                      {/* Where the row's Add / Edit button sits (a small button is h-8). */}
                      <dd className="h-8 w-16" />
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <aside className={PROFILE_ASIDE_CLASS}>
            <div className="border-t border-foreground pt-4">
              <SectionHeading>Your events</SectionHeading>
              <RegistrationsBars />
            </div>
          </aside>
          <div className={PROFILE_AFTER_CLASS}>
            <GetInvolved />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
};

// The member's event applications while they load. Most members have none,
// which reads as two short lines.
const RegistrationsBars = () => (
  <SkeletonText className="text-sm py-3" lines={2} />
);

export const RegistrationsSkeleton = () => (
  <SkeletonRegion label="Loading your applications…">
    <RegistrationsBars />
  </SkeletonRegion>
);
