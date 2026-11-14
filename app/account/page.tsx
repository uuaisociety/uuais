'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as CookieConsent from 'vanilla-cookieconsent';
import { Plus } from 'lucide-react';
import {
  auth,
  linkGoogleToCurrentUser,
  linkGithubToCurrentUser,
} from '@/lib/firebase-client';
import {
  upsertUserProfile,
  updateUserProfile,
  getMyRegistrations,
  getAllEvents,
  type UserProfile,
  type MemberCv,
} from '@/lib/firestore';
import {
  cancelRegistration,
  confirmRegistration,
} from '@/lib/firestore/registrations';
import type { EventRegistration } from '@/types';
import { Button } from '@/components/ui/Button';
import { InputBase, SelectBase, TextareaBase } from '@/components/ui/Form';
import { useNotify } from '@/components/ui/Notifications';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LoginModal from '@/components/ui/LoginModal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Tag, type TagVariant } from '@/components/ui/Tag';
import { HeroSplash } from '@/components/HeroSplash';

// The default light splash puts a cool lobe low-left, right behind the tab row;
// here only the warm glow stays, up high, away from the tabs.
const ACCOUNT_LIGHT_SPLASH =
  'radial-gradient(45rem 26rem at 80% 0%, oklch(from var(--primary) l c h / 16%), transparent 62%)';
import CvCard from '@/components/account/CvCard';
import { DISCORD_INVITE } from '@/components/common/DiscordCta';
import { updatePageMeta } from '@/utils/seo';
import { isReferralSource } from '@/lib/referrals';
import { publishProfile, refreshProfile, useAdmin } from '@/hooks/useAdmin';
import { joinUrl } from '@/lib/login-redirect';
import { withTimeout } from '@/lib/with-timeout';

// Event applications are secondary; a hung read shows a retry instead of blocking the page.
const REGISTRATIONS_TIMEOUT_MS = 15_000;
const SAVE_TIMEOUT_MS = 20_000;

// ------------------------------------------------------------------ tabs

// `short` labels let all four tabs fit a phone screen.
const TABS = [
  { id: 'profile', label: 'Profile', short: 'Profile' },
  { id: 'cv', label: 'CV for partners', short: 'CV' },
  { id: 'events', label: 'Events', short: 'Events' },
  { id: 'settings', label: 'Sign-in & privacy', short: 'Privacy' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// The open tab lives in the URL hash (#cv, #events…) so links and reloads land on it.
const TAB_EVENT = 'account-tab';
const subscribeTab = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  window.addEventListener(TAB_EVENT, onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(TAB_EVENT, onChange);
  };
};
const readTab = (): TabId => {
  const hash = window.location.hash.slice(1);
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : 'profile';
};
const selectTab = (id: TabId) => {
  // replaceState doesn't scroll to the panel the way setting location.hash would.
  window.history.replaceState(
    window.history.state,
    '',
    id === 'profile'
      ? window.location.pathname + window.location.search
      : `#${id}`,
  );
  window.dispatchEvent(new Event(TAB_EVENT));
};

// "?welcome=1" is added by /join after an account is created.
const noSubscribe = () => () => {};
const useJustJoined = () =>
  useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).has('welcome'),
    () => false,
  );

// ------------------------------------------------------------------ profile fields

type FieldKey =
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

type FieldDef = {
  key: FieldKey;
  label: string;
  hint?: string;
  kind: 'text' | 'url' | 'year' | 'select' | 'textarea' | 'heard';
  /** Matches the Firestore rules' caps where they exist. */
  max?: number;
  options?: [string, string][];
  placeholder?: string;
};

const HEARD_OF_US: [string, string][] = [
  ['posters', 'Posters'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['friends', 'Friends'],
  ['referral', 'Referral'],
  ['events', 'Events'],
  ['lecture', 'During a lecture'],
  ['other', 'Other'],
];
const KNOWN_SOURCES = HEARD_OF_US.map(([v]) => v);

const ABOUT: FieldDef[] = [
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

const LINKS: FieldDef[] = [
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

const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

/** The profile meter: ten things a complete member profile has. */
const completeness = (p: Partial<UserProfile>, hasCv: boolean) => {
  const steps: [string, boolean][] = [
    ['name', !isEmpty(p.name)],
    ['display name', !isEmpty(p.displayName)],
    ['student status', !isEmpty(p.studentStatus)],
    ['programme', p.studentStatus !== 'student' || !isEmpty(p.program)],
    ['graduation year', !isEmpty(p.expectedGraduationYear)],
    ['bio', !isEmpty(p.bio)],
    ['LinkedIn', !isEmpty(p.linkedin)],
    ['GitHub or website', !isEmpty(p.github) || !isEmpty(p.website)],
    ['how you found us', !isEmpty(p.heardOfUs)],
    ['CV', hasCv],
  ];
  return {
    done: steps.filter(([, ok]) => ok).length,
    total: steps.length,
    missing: steps.filter(([, ok]) => !ok).map(([label]) => label),
  };
};

const listOf = (items: string[]) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

// ------------------------------------------------------------------ registrations

const STATUS_TAG: Record<
  EventRegistration['status'],
  { label: string; variant: TagVariant }
> = {
  invited: { label: 'Invited', variant: 'red' },
  registered: { label: 'Registered', variant: 'blue' },
  confirmed: { label: 'Confirmed', variant: 'green' },
  waitlist: { label: 'Waitlist', variant: 'yellow' },
  declined: { label: 'Declined', variant: 'gray' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
};

type EventMeta = Record<
  string,
  { title: string; startAt?: string; category?: string; location?: string }
>;

const CATEGORY_LABEL: Record<string, string> = {
  workshop: 'Workshop',
  guest_lecture: 'Guest lecture',
  hackathon: 'Hackathon',
};

/** The member's applications to published events that started less than 24 hours ago, plus every event's title and time. */
const fetchRegistrations = async (uid: string) => {
  const [regs, events] = await withTimeout(
    Promise.all([getMyRegistrations(uid), getAllEvents()]),
    REGISTRATIONS_TIMEOUT_MS,
  );
  const registrations = regs.filter((reg) =>
    events.some(
      (ev) =>
        ev.id === reg.eventId &&
        ev.published === true &&
        ev.eventStartAt &&
        new Date(ev.eventStartAt).getTime() >
          new Date().getTime() - 24 * 60 * 60 * 1000,
    ),
  );
  const meta: EventMeta = {};
  for (const ev of events) {
    meta[ev.id] = {
      title: ev.title,
      startAt: ev.eventStartAt,
      category: ev.category,
      location: ev.location,
    };
  }
  return { registrations, meta };
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatWhen = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
};

// ------------------------------------------------------------------ small pieces

const NOT_SET = <span className="text-muted-foreground">Not set</span>;

const Status = ({ children }: { children: ReactNode }) => (
  <div role="status" className="min-h-screen bg-background pt-24 px-4">
    <div className="max-w-3xl mx-auto text-muted-foreground">{children}</div>
  </div>
);

const SectionHeading = ({
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

const ToggleRow = ({
  label,
  description,
  checked,
  disabled,
  lockedReason,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  lockedReason?: string;
  onChange: (next: boolean) => void;
}) => (
  <label className="flex items-start justify-between gap-6 py-3.5 border-t border-border cursor-pointer has-[:disabled]:cursor-not-allowed">
    <span>
      <span className="block text-foreground font-medium">{label}</span>
      {(lockedReason || description) && (
        <span className="block text-sm text-muted-foreground mt-0.5">
          {lockedReason || description}
        </span>
      )}
    </span>
    <input
      type="checkbox"
      role="switch"
      className="mt-1 size-4 accent-[var(--primary)]"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

// ------------------------------------------------------------------ page

export default function AccountPage() {
  const { notify } = useNotify();
  const router = useRouter();
  // The shared auth store already holds the profile (e.g. straight after /join), so the page renders without re-reading it.
  const { user, loading, profile, profileLoading, profileError, isPartner } =
    useAdmin({ eager: true });
  const uid = user?.uid ?? null;
  const tab = useSyncExternalStore(subscribeTab, readTab, () => 'profile');

  // Latch the welcome, then drop ?welcome=1 so a reload or bookmark doesn't repeat it.
  const welcomeInUrl = useJustJoined();
  const [justJoined, setJustJoined] = useState(false);
  if (welcomeInUrl && !justJoined) setJustJoined(true);
  useEffect(() => {
    if (!justJoined) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + url.search + url.hash,
    );
  }, [justJoined]);

  // One row is edited at a time and saved on its own.
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);

  const [hasCv, setHasCv] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<string[] | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [registrationsState, setRegistrationsState] = useState<
    'loading' | 'error' | 'ready'
  >('loading');
  const [eventMeta, setEventMeta] = useState<EventMeta>({});
  const [registrationsAttempt, setRegistrationsAttempt] = useState(0);
  const [confirmRegId, setConfirmRegId] = useState<string | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  useEffect(() => {
    updatePageMeta(
      'My Account',
      'Manage your UU AI Society account and event registrations',
    );
  }, []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetchRegistrations(uid).then(
      (result) => {
        if (cancelled) return;
        setEventMeta(result.meta);
        setRegistrations(result.registrations);
        setRegistrationsState('ready');
      },
      (err: unknown) => {
        if (cancelled) return;
        console.warn('Failed to load event applications:', err);
        setRegistrationsState('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uid, registrationsAttempt]);

  const current: Partial<UserProfile> = profile ?? {};

  // ---- saving

  const save = async (patch: Partial<UserProfile>): Promise<boolean> => {
    if (!uid) return false;
    try {
      await withTimeout(
        profile
          ? updateUserProfile(uid, patch)
          : upsertUserProfile(uid, { ...patch, isMember: true }),
        SAVE_TIMEOUT_MS,
      );
      // Show the change everywhere at once; a read reconciles it in the background.
      publishProfile({ ...current, ...patch, id: uid } as UserProfile);
      void refreshProfile();
      return true;
    } catch (e) {
      console.error('Saving the profile failed:', e);
      notify({
        type: 'error',
        title: 'Not saved',
        message:
          'Your change wasn’t saved. Check your connection and try again.',
      });
      return false;
    }
  };

  const startEdit = (key: FieldKey) => {
    setEditing(key);
    setDraft(
      key === 'heardOfUs'
        ? { heardOfUs: current.heardOfUs, referredBy: current.referredBy }
        : { [key]: current[key] },
    );
  };

  const saveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    const patch: Record<string, unknown> = { ...draft };
    if (editing === 'heardOfUs' && !isReferralSource(draft.heardOfUs))
      patch.referredBy = '';
    for (const [k, v] of Object.entries(patch))
      if (typeof v === 'string') patch[k] = v.trim();
    const ok = await save(patch as Partial<UserProfile>);
    setSaving(false);
    if (ok) {
      setEditing(null);
      notify({ type: 'success', title: 'Saved', message: 'Profile updated.' });
    }
  };

  const toggle = async (key: keyof UserProfile, value: boolean) => {
    if (await save({ [key]: value }))
      notify({
        type: 'success',
        title: 'Saved',
        message: 'Preference updated.',
      });
  };

  const handleCvChange = (cv: MemberCv | null) => {
    const had = hasCv;
    setHasCv(Boolean(cv));
    // Removing the CV restored the member's earlier partner-contact choice server-side.
    if (!cv && had) void refreshProfile();
  };

  // ---- sign-in methods

  const providerIds =
    providers ?? (user?.providerData || []).map((pd) => pd.providerId);
  const handleLink = async (prov: 'google' | 'github') => {
    if (!auth.currentUser) return;
    try {
      if (prov === 'google') await linkGoogleToCurrentUser(auth.currentUser);
      else await linkGithubToCurrentUser(auth.currentUser);
      await auth.currentUser.reload();
      setProviders(
        (auth.currentUser.providerData || []).map((pd) => pd.providerId),
      );
      notify({
        type: 'success',
        title: 'Linked',
        message: `${prov === 'google' ? 'Google' : 'GitHub'} linked successfully.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not link provider.';
      notify({ type: 'error', title: 'Link failed', message: msg });
    }
  };

  // ---- events

  const confirmSpot = async (r: EventRegistration) => {
    try {
      if (!r.confirmationToken)
        throw new Error(
          'Missing confirmation token. Please contact us if you have problems confirming your spot.',
        );
      const res = await confirmRegistration(r.id, r.confirmationToken);
      if (!res.ok) throw new Error(res.message);
      notify({
        type: 'success',
        title: 'Confirmed',
        message: 'Your spot has been confirmed.',
      });
      if (uid) setRegistrations(await getMyRegistrations(uid));
    } catch (e: unknown) {
      notify({
        type: 'error',
        title: 'Confirm failed',
        message:
          e instanceof Error
            ? e.message
            : 'Could not confirm. Please contact us if you have problems confirming your spot.',
      });
    }
  };

  // ---- delete

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(body?.error || `Deletion failed (${res.status})`);
      await auth.signOut();
      // Clear the httpOnly AuthToken cookie, which outlives the deleted account.
      await fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
      notify({
        type: 'success',
        title: 'Account deleted',
        message: 'Your account and personal data have been deleted.',
      });
      router.push('/');
    } catch (e: unknown) {
      notify({
        type: 'error',
        title: 'Deletion failed',
        message:
          e instanceof Error ? e.message : 'Could not delete your account.',
      });
    } finally {
      setConfirmDeleteAccount(false);
    }
  };

  // ---- states before the page

  if (loading) return <Status>Loading your account…</Status>;
  if (!uid) return <LoginModal after={() => router.push('/account')} />;
  if (profileLoading) return <Status>Loading your account…</Status>;
  if (profileError) {
    return (
      <Status>
        <p className="text-foreground">
          We couldn&apos;t load your account. This is usually a connection
          problem; we&apos;ll keep trying in the background.
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void refreshProfile()}
        >
          Try again now
        </Button>
      </Status>
    );
  }
  const isMemberComplete =
    Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt);
  if (!isMemberComplete && !isPartner) {
    // The RegistrationGate redirects to /join; this covers the moment before it does.
    return (
      <Status>
        <p className="text-foreground">Your account isn&apos;t finished yet.</p>
        <Link href={joinUrl('/account')} className="underline font-medium">
          Finish creating your account
        </Link>
      </Status>
    );
  }

  // ---- derived

  const name =
    current.displayName || current.name || user?.email?.split('@')[0] || '';
  const initials =
    (current.name || current.displayName || user?.email || '?')
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?';
  const memberSince = current.createdAt ? formatDate(current.createdAt) : null;
  const meter = completeness(current, hasCv === true);
  const invites = registrations.filter((r) => r.status === 'invited');
  const upcoming = registrations.filter(
    (r) => r.status !== 'cancelled' && r.status !== 'declined',
  );

  const MISSING_FIELD: Record<string, FieldKey> = {
    name: 'name',
    'display name': 'displayName',
    'student status': 'studentStatus',
    programme: 'program',
    'graduation year': 'expectedGraduationYear',
    bio: 'bio',
    LinkedIn: 'linkedin',
    'GitHub or website': 'github',
    'how you found us': 'heardOfUs',
  };
  const finishProfile = () => {
    const first = meter.missing[0];
    if (first === 'CV') return selectTab('cv');
    selectTab('profile');
    if (MISSING_FIELD[first]) startEdit(MISSING_FIELD[first]);
  };

  // ---- profile rows

  const displayValue = (f: FieldDef): ReactNode => {
    const v = current[f.key];
    if (isEmpty(v)) return NOT_SET;
    if (f.kind === 'heard') {
      const label = HEARD_OF_US.find(([k]) => k === v)?.[1] ?? String(v);
      return isReferralSource(v as string) && current.referredBy
        ? `${label} · ${current.referredBy}`
        : label;
    }
    if (f.kind === 'select')
      return f.options?.find(([k]) => k === v)?.[1] ?? String(v);
    if (f.kind === 'url')
      return (
        <a
          href={String(v)}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-3 decoration-border hover:decoration-current break-all"
        >
          {String(v).replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      );
    return (
      <span className={f.kind === 'textarea' ? 'whitespace-pre-line' : ''}>
        {String(v)}
      </span>
    );
  };

  const set = (patch: Partial<UserProfile>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const editor = (f: FieldDef): ReactNode => {
    const common = { id: `edit-${f.key}`, autoFocus: true };
    switch (f.kind) {
      case 'select':
        return (
          <SelectBase
            {...common}
            value={(draft[f.key] as string) ?? ''}
            onChange={(e) => set({ [f.key]: e.target.value })}
          >
            <option value="">Not set</option>
            {f.options?.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </SelectBase>
        );
      case 'textarea':
        return (
          <>
            <TextareaBase
              {...common}
              rows={3}
              maxLength={f.max}
              placeholder={f.placeholder}
              value={(draft[f.key] as string) ?? ''}
              onChange={(e) => set({ [f.key]: e.target.value })}
            />
            <p className="mono-meta text-muted-foreground text-right mt-1.5">
              {String(draft[f.key] ?? '').length} / {f.max}
            </p>
          </>
        );
      case 'year':
        return (
          <InputBase
            {...common}
            type="number"
            // The Firestore rules accept 1950–2100.
            min={1950}
            max={2100}
            placeholder={f.placeholder}
            value={draft.expectedGraduationYear ?? ''}
            onChange={(e) =>
              set({
                expectedGraduationYear: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        );
      case 'heard': {
        const v = draft.heardOfUs ?? '';
        const source = !v || KNOWN_SOURCES.includes(v) ? v : 'other';
        return (
          <div className="space-y-2">
            <SelectBase
              {...common}
              value={source}
              onChange={(e) => set({ heardOfUs: e.target.value })}
            >
              <option value="">Not set</option>
              {HEARD_OF_US.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </SelectBase>
            {isReferralSource(source) && (
              <InputBase
                aria-label="Who told you?"
                maxLength={200}
                placeholder="Who told you? (optional)"
                value={draft.referredBy ?? ''}
                onChange={(e) => set({ referredBy: e.target.value })}
              />
            )}
            {source === 'other' && (
              <InputBase
                aria-label="Where did you hear of us?"
                maxLength={200}
                placeholder="Where? (optional)"
                value={v === 'other' ? '' : v}
                onChange={(e) => set({ heardOfUs: e.target.value || 'other' })}
              />
            )}
          </div>
        );
      }
      default:
        return (
          <InputBase
            {...common}
            type={f.kind === 'url' ? 'url' : 'text'}
            inputMode={f.kind === 'url' ? 'url' : undefined}
            maxLength={f.max}
            placeholder={f.placeholder}
            value={(draft[f.key] as string) ?? ''}
            onChange={(e) => set({ [f.key]: e.target.value })}
          />
        );
    }
  };

  const rows = (fields: FieldDef[]) => (
    <dl className="border-b border-border">
      {fields
        .filter(
          (f) => f.key !== 'program' || current.studentStatus !== 'alumni',
        )
        .map((f) =>
          editing === f.key ? (
            <form
              key={f.key}
              onSubmit={saveRow}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(null);
              }}
              className="grid sm:grid-cols-[13rem_1fr] gap-x-6 gap-y-2 py-4 border-t border-border"
            >
              <label
                htmlFor={`edit-${f.key}`}
                className="sm:pt-2 text-sm text-muted-foreground"
              >
                {f.label}
                {f.hint && (
                  <span className="block mono-meta mt-0.5">{f.hint}</span>
                )}
              </label>
              <div>
                {editor(f)}
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={saving}>
                    Save
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div
              key={f.key}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[13rem_1fr_auto] items-center gap-x-6 gap-y-0.5 py-3 border-t border-border"
            >
              <dt className="text-sm text-muted-foreground col-span-2 sm:col-span-1">
                {f.label}
                {f.hint && <span className="mono-meta ml-2">{f.hint}</span>}
              </dt>
              <dd className="text-foreground font-medium min-w-0">
                {displayValue(f)}
              </dd>
              <dd>
                <Button
                  size="sm"
                  variant="ghost"
                  className={
                    isEmpty(current[f.key])
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }
                  icon={isEmpty(current[f.key]) ? Plus : undefined}
                  disabled={editing !== null}
                  aria-label={`${isEmpty(current[f.key]) ? 'Add' : 'Edit'} ${f.label.toLowerCase()}`}
                  onClick={() => startEdit(f.key)}
                >
                  {isEmpty(current[f.key]) ? 'Add' : 'Edit'}
                </Button>
              </dd>
            </div>
          ),
        )}
    </dl>
  );

  const eventList = (list: EventRegistration[], compact: boolean) => (
    <ul>
      {list.map((r) => {
        const tag = STATUS_TAG[r.status];
        const meta = eventMeta[r.eventId];
        const when = [
          meta?.category && CATEGORY_LABEL[meta.category],
          formatWhen(meta?.startAt),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <li key={r.id} className="py-4 border-b border-border">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Link
                href={`/events/${r.eventId}`}
                className="font-semibold tracking-[-0.015em] text-foreground hover:text-primary transition-colors"
              >
                {eventMeta[r.eventId]?.title || 'Unknown event'}
              </Link>
              {tag && (
                <Tag size="sm" variant={tag.variant}>
                  {tag.label}
                </Tag>
              )}
            </div>
            {when && (
              <p className="mono-meta text-muted-foreground mt-1">{when}</p>
            )}
            {meta?.location && (
              <p className="mono-meta text-muted-foreground mt-0.5">
                {meta.location}
              </p>
            )}
            {!compact && r.registeredAt && (
              <p className="mono-meta text-muted-foreground mt-0.5">
                Applied{' '}
                {new Date(r.registeredAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            )}
            {(r.status === 'invited' ||
              r.status === 'registered' ||
              r.status === 'waitlist') && (
              <div className="flex gap-2 mt-3">
                {r.status === 'invited' && (
                  <Button size="sm" onClick={() => void confirmSpot(r)}>
                    Confirm my spot
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={r.status === 'invited' ? 'ghost' : 'outline'}
                  aria-label={`${r.status === 'invited' ? 'Decline' : 'Cancel'} ${eventMeta[r.eventId]?.title ?? 'this event'}`}
                  onClick={() => setConfirmRegId(r.id)}
                >
                  {r.status === 'invited' ? 'Decline' : 'Cancel'}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const registrationsBody = (compact: boolean) =>
    registrationsState === 'loading' ? (
      <p role="status" className="text-sm text-muted-foreground py-3">
        Loading your applications…
      </p>
    ) : registrationsState === 'error' ? (
      <div role="alert" className="text-sm py-3">
        <p className="text-foreground">
          We couldn&apos;t load your event applications.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => {
            setRegistrationsState('loading');
            setRegistrationsAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    ) : (compact ? upcoming : registrations).length === 0 ? (
      <p className="text-sm text-muted-foreground py-3">
        You haven&apos;t applied to any upcoming events yet.{' '}
        <Link href="/events" className="underline text-foreground">
          See what&apos;s coming up
        </Link>
        .
      </p>
    ) : (
      eventList(compact ? upcoming.slice(0, 3) : registrations, compact)
    );

  const inviteLabel = `${invites.length} invite${invites.length > 1 ? 's' : ''}`;
  const tabState = (id: TabId): string =>
    id === 'cv' && hasCv !== null
      ? hasCv
        ? 'shared'
        : 'not shared'
      : id === 'events' && invites.length > 0
        ? inviteLabel
        : '';
  const tabSuffix = (id: TabId): ReactNode => {
    if (id === 'cv' && hasCv !== null)
      return (
        <span
          aria-hidden
          className="hidden sm:inline mono-meta text-current/55 pt-1"
        >
          {tabState(id)}
        </span>
      );
    if (id === 'events' && invites.length > 0)
      return (
        <span
          aria-hidden
          className="mono-meta rounded-sm bg-primary px-1.5 text-primary-foreground"
        >
          <span className="sm:hidden">{invites.length}</span>
          <span className="hidden sm:inline">{inviteLabel}</span>
        </span>
      );
    return null;
  };

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length];
    selectTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  const linkClass =
    'underline underline-offset-3 decoration-border hover:decoration-current';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background pb-24 transition-colors duration-300">
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
                  {initials}
                </div>
                <div className="min-w-0">
                  <h1 className="display-lg break-words">
                    {justJoined ? `Welcome, ${name}` : name}
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-current/65">
                    <span className="inline-flex items-center gap-2 text-current font-medium">
                      {justJoined
                        ? 'Your account is ready. You’re now a member.'
                        : isMemberComplete
                          ? 'Member'
                          : 'Partner account'}
                    </span>
                    <span aria-hidden className="hidden sm:inline">
                      ·
                    </span>
                    <span className="mono-meta [overflow-wrap:anywhere] basis-full sm:basis-auto">
                      {user?.email}
                      {memberSince ? ` · since ${memberSince}` : ''}
                    </span>
                  </p>
                </div>
              </div>

              <div className="w-full md:w-72 shrink-0">
                <p className="flex items-baseline justify-between mb-2.5 text-current/65">
                  <span>Profile</span>
                  <span className="mono-meta text-current">
                    {meter.done} / {meter.total} done
                  </span>
                </p>
                <div
                  role="meter"
                  aria-label="Profile completeness"
                  aria-valuemin={0}
                  aria-valuemax={meter.total}
                  aria-valuenow={meter.done}
                  className="grid grid-cols-10 gap-1"
                >
                  {Array.from({ length: meter.total }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-[2px] transition-colors duration-300 ${i < meter.done ? 'bg-current' : 'bg-current/15'}`}
                    />
                  ))}
                </div>
                {meter.missing.length > 0 && (
                  <button
                    type="button"
                    onClick={finishProfile}
                    className="mt-3 text-sm text-left underline underline-offset-3 decoration-current/30 hover:decoration-current cursor-pointer"
                  >
                    Add {listOf(meter.missing.slice(0, 3))}
                  </button>
                )}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Account sections"
              className="flex sm:gap-1 overflow-x-auto border-t border-current/10 -mx-2 sm:mx-0"
            >
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  aria-label={[t.label, tabState(t.id)]
                    .filter(Boolean)
                    .join(' ')}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => selectTab(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`shrink-0 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-4 pt-3.5 pb-4 text-sm font-medium border-b-2 transition-colors duration-200 cursor-pointer ${tab === t.id ? 'border-primary text-current' : 'border-transparent text-current/60 hover:text-current'}`}
                >
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                  {tabSuffix(t.id)}
                </button>
              ))}
            </div>
          </div>
        </HeroSplash>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10">
          {/* Every panel stays mounted (hidden when closed) so the CV and event state behind the tab labels is always known. */}
          <section
            id="panel-profile"
            role="tabpanel"
            aria-labelledby="tab-profile"
            hidden={tab !== 'profile'}
            className="grid lg:grid-cols-[1fr_20rem] lg:grid-rows-[auto_1fr] gap-x-14 gap-y-12"
          >
            <div className="space-y-10 min-w-0 lg:col-start-1 lg:row-start-1 lg:row-span-2">
              <div>
                <SectionHeading hint="Your display name is shown publicly, for example on the referral leaderboard.">
                  About you
                </SectionHeading>
                {rows(ABOUT)}
              </div>
              <div>
                <SectionHeading>Links</SectionHeading>
                {rows(LINKS)}
              </div>
            </div>
            {/* An invite waiting for an answer comes first on small screens, above the long profile list. */}
            <aside
              className={`lg:col-start-2 lg:row-start-1 ${invites.length > 0 ? 'order-first lg:order-none' : ''}`}
            >
              <div className="border-t border-foreground pt-4">
                <SectionHeading>
                  {invites.length > 0 ? 'Needs your answer' : 'Your events'}
                </SectionHeading>
                {registrationsBody(true)}
                {upcoming.length > 3 && (
                  <button
                    type="button"
                    onClick={() => selectTab('events')}
                    className={`mt-3 text-sm cursor-pointer ${linkClass}`}
                  >
                    All event applications
                  </button>
                )}
              </div>
            </aside>
            <div className="lg:col-start-2 lg:row-start-2 self-start">
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
                    <span className="text-muted-foreground">
                      to meet other members
                    </span>
                  </li>
                  <li>
                    <Link href="/events" className={linkClass}>
                      Browse upcoming events
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section
            id="panel-cv"
            role="tabpanel"
            aria-labelledby="tab-cv"
            hidden={tab !== 'cv'}
            className="max-w-3xl"
          >
            <CvCard
              uid={uid}
              isMember={current.isMember === true}
              emailVerified={
                providerIds.includes('google.com') ||
                auth.currentUser?.emailVerified === true
              }
              onCvChange={handleCvChange}
            />
          </section>

          <section
            id="panel-events"
            role="tabpanel"
            aria-labelledby="tab-events"
            hidden={tab !== 'events'}
            className="max-w-3xl"
          >
            <SectionHeading hint="Applications to upcoming events. Past events drop off a day after they start.">
              My event applications
            </SectionHeading>
            <div className="border-t border-border">
              {registrationsBody(false)}
            </div>
          </section>

          <section
            id="panel-settings"
            role="tabpanel"
            aria-labelledby="tab-settings"
            hidden={tab !== 'settings'}
            className="max-w-3xl space-y-12"
          >
            <div>
              <SectionHeading hint="Ways you can sign in to this account. Linking one more is a good backup.">
                Sign-in methods
              </SectionHeading>
              <ul className="border-b border-border">
                {providerIds.includes('password') && (
                  <li className="flex items-center justify-between gap-4 py-3.5 border-t border-border">
                    <span className="text-foreground font-medium min-w-0">
                      Email link{' '}
                      <span className="mono-meta text-muted-foreground font-normal break-all">
                        {user?.email}
                      </span>
                    </span>
                    <Tag size="sm" variant="green">
                      Linked
                    </Tag>
                  </li>
                )}
                {(
                  [
                    ['google', 'google.com', 'Google'],
                    ['github', 'github.com', 'GitHub'],
                  ] as const
                ).map(([prov, id, label]) => (
                  <li
                    key={prov}
                    className="flex items-center justify-between gap-4 py-3.5 border-t border-border"
                  >
                    <span className="text-foreground font-medium">{label}</span>
                    {providerIds.includes(id) ? (
                      <Tag size="sm" variant="green">
                        Linked
                      </Tag>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Link ${label}`}
                        onClick={() => void handleLink(prov)}
                      >
                        Link
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <SectionHeading hint="Changes save as soon as you tick or untick a box.">
                Emails and contact
              </SectionHeading>
              <div className="border-b border-border">
                <ToggleRow
                  label="Newsletter"
                  description="Events and news from the society."
                  checked={Boolean(current.newsletter)}
                  onChange={(v) => void toggle('newsletter', v)}
                />
                <ToggleRow
                  label="Marketing communications"
                  checked={Boolean(current.marketingOptIn)}
                  onChange={(v) => void toggle('marketingOptIn', v)}
                />
                <ToggleRow
                  label="Contact from partner companies"
                  description="Partners may reach out about internships, theses and jobs."
                  lockedReason={
                    hasCv
                      ? 'On while your CV is shared. Remove your CV to turn this off.'
                      : undefined
                  }
                  checked={hasCv ? true : Boolean(current.partnerContactOptIn)}
                  disabled={Boolean(hasCv)}
                  onChange={(v) => void toggle('partnerContactOptIn', v)}
                />
                <ToggleRow
                  label="Looking for job opportunities"
                  checked={Boolean(current.lookingForJob)}
                  onChange={(v) => void toggle('lookingForJob', v)}
                />
                <ToggleRow
                  label="Anonymous usage analytics"
                  description="Link and page interactions, never tied to your name."
                  checked={Boolean(current.analyticsOptIn)}
                  onChange={(v) => void toggle('analyticsOptIn', v)}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {current.privacyAcceptedAt
                  ? `You accepted the privacy policy on ${formatDate(current.privacyAcceptedAt)}. `
                  : ''}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-3"
                >
                  Privacy policy
                </a>{' '}
                ·{' '}
                <button
                  type="button"
                  onClick={() => CookieConsent.showPreferences()}
                  className="underline underline-offset-3 cursor-pointer"
                >
                  Change cookie settings
                </button>
              </p>
            </div>

            <div>
              <SectionHeading hint="Permanently deletes your profile, shared CV, event registrations, attendance history, team and board applications, showcase projects, and uploaded files.">
                Delete account
              </SectionHeading>
              <Button
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/[0.06]"
                onClick={() => setConfirmDeleteAccount(true)}
              >
                Delete account
              </Button>
            </div>
          </section>
        </div>

        <ConfirmModal
          open={!!confirmRegId}
          title="Unregister from event"
          description="Are you sure you want to unregister from this event?"
          confirmText="Yes, unregister"
          cancelText="Keep registration"
          onClose={() => setConfirmRegId(null)}
          onConfirm={async () => {
            if (!confirmRegId) return;
            try {
              await cancelRegistration(confirmRegId);
              notify({
                type: 'success',
                title: 'Cancelled',
                message: 'Your registration has been cancelled.',
              });
              if (uid) setRegistrations(await getMyRegistrations(uid));
            } catch (e: unknown) {
              notify({
                type: 'error',
                title: 'Cancel failed',
                message:
                  e instanceof Error
                    ? e.message
                    : 'Could not cancel. Please contact us if you have problems unregistering for the event.',
              });
            } finally {
              setConfirmRegId(null);
            }
          }}
        />
        <ConfirmModal
          open={confirmDeleteAccount}
          title="Delete account"
          description="This permanently deletes your profile, shared CV, event registrations, attendance history, team and board applications, showcase projects, uploaded files, and sign-in. This cannot be undone."
          confirmText="Delete my account"
          cancelText="Keep account"
          onClose={() => setConfirmDeleteAccount(false)}
          onConfirm={handleDeleteAccount}
        />
      </div>
    </ErrorBoundary>
  );
}
