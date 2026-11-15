'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, GoogleIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { FieldGroup, InputBase, SelectBase } from '@/components/ui/Form';
import { useNotify } from '@/components/ui/Notifications';
import { DiscordCta } from '@/components/common/DiscordCta';
import EmailLinkSignIn from '@/components/auth/EmailLinkSignIn';
import { SkeletonRegion } from '@/components/ui/skeleton';
import {
  CreateAccountHeader,
  DetailsHeader,
  DetailsStepSkeleton,
  EMAIL_LABEL,
  JOIN_COLUMN_CLASS,
  JOIN_LABELS,
  JOIN_PAGE_CLASS,
  JoinIntro,
  JoinOrSeparator,
  NEWSLETTER_CONSENT,
  PrivacyConsent,
  SIGN_IN_CONTENT_CLASS,
  SIGN_IN_PROVIDERS_CLASS,
} from '@/components/pages/JoinLayout';
import { updatePageMeta } from '@/utils/seo';
import {
  ensureAuth,
  publishProfile,
  refreshProfile,
  useAdmin,
} from '@/hooks/useAdmin';
import { currentRedirect } from '@/lib/login-redirect';
import { signInErrorMessage } from '@/lib/sign-in-error';
import { isReferralSource } from '@/lib/referrals';
import { TimeoutError, withTimeout } from '@/lib/with-timeout';
import type { UserProfile } from '@/lib/firestore/users';

// A hung Firestore write would otherwise leave "Creating your account…" spinning forever.
const SAVE_TIMEOUT_MS = 15_000;

const HEARD_OF_US = [
  ['posters', 'Posters'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['friends', 'Friends'],
  ['referral', 'Referral'],
  ['events', 'Events'],
  ['lecture', 'During a lecture'],
  ['other', 'Other'],
] as const;
const KNOWN_SOURCES: string[] = HEARD_OF_US.map(([value]) => value);

type Draft = {
  name: string;
  studentStatus: 'student' | 'alumni' | 'other';
  program: string;
  heardSource: string;
  heardOther: string;
  referredBy: string;
  newsletter: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: '',
  studentStatus: 'student',
  program: '',
  heardSource: '',
  heardOther: '',
  referredBy: '',
  newsletter: false,
};

// Kept per tab, so a reload or a detour to the privacy policy doesn't wipe what was typed.
const draftKey = (uid: string) => `joinDraft:${uid}`;

const readDraft = (uid: string): Partial<Draft> | null => {
  try {
    const raw = window.sessionStorage.getItem(draftKey(uid));
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
};

const writeDraft = (uid: string, draft: Draft | null) => {
  try {
    if (draft)
      window.sessionStorage.setItem(draftKey(uid), JSON.stringify(draft));
    else window.sessionStorage.removeItem(draftKey(uid));
  } catch {
    // Storage blocked: the form just isn't restored after a reload.
  }
};

/** Start from what's already known: a half-finished profile, then the sign-in provider's name. */
const initialDraft = (
  profile: UserProfile | null,
  providerName: string | null,
): Draft => {
  const heard = profile?.heardOfUs ?? '';
  const known = !heard || KNOWN_SOURCES.includes(heard);
  return {
    ...EMPTY_DRAFT,
    // The Firestore rules cap names at 100 characters; a long provider name mustn't block saving.
    name: (profile?.name || profile?.displayName || providerName || '').slice(
      0,
      100,
    ),
    studentStatus: profile?.studentStatus ?? 'student',
    program: profile?.program ?? '',
    heardSource: known ? heard : 'other',
    heardOther: known ? '' : heard,
    referredBy: profile?.referredBy ?? '',
    newsletter: Boolean(profile?.newsletter),
  };
};

const saveErrorMessage = (e: unknown): string => {
  if (e instanceof TimeoutError)
    return 'Creating your account is taking longer than usual. It will finish by itself once your connection is back, or you can try again. What you typed is kept.';
  const code = (e as { code?: unknown })?.code;
  if (code === 'unavailable')
    return 'You seem to be offline. Check your connection and try again. What you typed is kept.';
  return 'We couldn’t create your account. Please try again, or contact contact@uuais.com if it keeps failing.';
};

const JoinPage: React.FC = () => {
  const router = useRouter();
  const { notify } = useNotify();
  const { user, loading, cached, profile, profileLoading, profileError } =
    useAdmin();
  const uid = user?.uid ?? null;
  const completed =
    Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt);

  const [pendingProvider, setPendingProvider] = useState<
    'google' | 'github' | null
  >(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; privacy?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const privacyRef = useRef<HTMLInputElement>(null);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    updatePageMeta(
      'Join Us',
      'Create an account and become a member of UU AI Society',
    );
    // Arriving from an emailed sign-in link: start auth now so the page (and
    // the header) show the signed-in state without the usual idle delay.
    if (new URLSearchParams(window.location.search).has('oobCode'))
      ensureAuth();
  }, []);

  // Fill the form once per signed-in user, from a saved draft if this tab has one.
  const showForm = Boolean(uid) && !profileLoading && !profileError;
  if (showForm && uid && draftFor !== uid) {
    setDraftFor(uid);
    setDraft({
      ...initialDraft(profile, user?.displayName ?? null),
      ...readDraft(uid),
    });
  }

  // Move focus to the form when it replaces the sign-in options.
  const formVisible = showForm && !completed && !created;
  useEffect(() => {
    if (!formVisible) return;
    formHeadingRef.current?.focus();
    // Another tab (e.g. the one the email link opened) may finish the account;
    // re-check on return so this one shows "already a member" instead of the form.
    const recheck = () => {
      if (document.visibilityState === 'visible') void refreshProfile();
    };
    document.addEventListener('visibilitychange', recheck);
    return () => document.removeEventListener('visibilitychange', recheck);
  }, [formVisible]);

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (uid) writeDraft(uid, next);
      return next;
    });
  };

  const popupSignIn = async (provider: 'google' | 'github') => {
    setSignInError(null);
    setPendingProvider(provider);
    ensureAuth();
    try {
      const m = await import('@/lib/firebase-client');
      await (provider === 'google'
        ? m.signInWithGooglePopup()
        : m.signInWithGithubPopup());
    } catch (e) {
      setSignInError(signInErrorMessage(e));
      console.error('Sign-in failed:', e);
    } finally {
      setPendingProvider(null);
    }
  };

  // Hovering or focusing a provider button starts the SDK download, so the popup opens right on click.
  const warmFirebase = () => {
    void import('@/lib/firebase-client');
  };

  // A timed-out save can still commit later, and the user may retry meanwhile: finish only once.
  const finished = useRef(false);
  const finish = (saved: UserProfile) => {
    if (finished.current) return;
    finished.current = true;
    setCreated(true);
    setSaveError(null);
    writeDraft(saved.id, null);
    // Show a member straight away (gate, header, /account); a read reconciles in the background.
    publishProfile(saved);
    void refreshProfile();
    notify({
      type: 'success',
      title: 'Account created',
      message: 'Welcome to UU AI Society! You are now a member.',
      timeoutMs: 6000,
    });
    // Registration is often a detour (e.g. an application form) — return there.
    const target = currentRedirect();
    router.push(
      !target || target.split('?')[0] === '/account'
        ? '/account?welcome=1'
        : target,
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || saving) return;
    const name = draft.name.trim();
    const nextErrors = {
      name: name ? undefined : 'Please enter your name.',
      privacy: privacyAccepted
        ? undefined
        : 'Please accept the privacy policy to create your account.',
    };
    setErrors(nextErrors);
    if (nextErrors.name) {
      nameRef.current?.focus();
      return;
    }
    if (nextErrors.privacy) {
      privacyRef.current?.focus();
      return;
    }

    setSaving(true);
    setSaveError(null);
    const heardOfUs =
      draft.heardSource === 'other'
        ? draft.heardOther.trim()
        : draft.heardSource;
    const save = (async (): Promise<UserProfile> => {
      const { getUserProfile, upsertUserProfile, updateUserProfile } =
        await import('@/lib/firestore/users');
      // Read fresh: another tab may have created the profile since this one loaded.
      const existing = await getUserProfile(uid);
      if (existing?.isMember && existing.privacyAcceptedAt) return existing;
      const data: Partial<UserProfile> = {
        name,
        displayName: existing?.displayName || name,
        email: user?.email ?? undefined,
        studentStatus: draft.studentStatus,
        program:
          draft.studentStatus === 'student' ? draft.program.trim() : undefined,
        heardOfUs: heardOfUs || undefined,
        referredBy: isReferralSource(draft.heardSource)
          ? draft.referredBy.trim()
          : undefined,
        newsletter: draft.newsletter,
        privacyAcceptedAt: new Date().toISOString(),
      };
      if (!existing) {
        await upsertUserProfile(uid, { ...data, isMember: true });
        return { ...data, id: uid, isMember: true } as UserProfile;
      }
      // isMember is admin-managed once set; only add it when missing.
      const patch = 'isMember' in existing ? data : { ...data, isMember: true };
      await updateUserProfile(uid, patch);
      return { ...existing, ...patch, id: uid } as UserProfile;
    })();
    try {
      finish(await withTimeout(save, SAVE_TIMEOUT_MS));
    } catch (err) {
      console.error('Creating the profile failed:', err);
      // A slow write is still queued and commits once the connection is back; finish then.
      if (err instanceof TimeoutError) save.then(finish, () => undefined);
      setSaveError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const redirect = currentRedirect();

  return (
    <div className={JOIN_PAGE_CLASS}>
      <div className={JOIN_COLUMN_CLASS}>
        <JoinIntro />

        {!uid && loading && cached ? (
          // A returning visitor: their session is still being restored.
          <SkeletonRegion label="Checking your account…">
            <DetailsStepSkeleton email={cached.email} />
          </SkeletonRegion>
        ) : !uid ? (
          <Card>
            <CreateAccountHeader />
            <CardContent className={SIGN_IN_CONTENT_CLASS}>
              <div className={SIGN_IN_PROVIDERS_CLASS}>
                <Button
                  variant="outline"
                  isLoading={pendingProvider === 'google'}
                  disabled={pendingProvider !== null}
                  onPointerEnter={warmFirebase}
                  onFocus={warmFirebase}
                  onClick={() => void popupSignIn('google')}
                >
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon icon={GoogleIcon} className="h-4 w-4" />
                    Continue with Google
                  </span>
                </Button>
                <Button
                  variant="outline"
                  isLoading={pendingProvider === 'github'}
                  disabled={pendingProvider !== null}
                  onPointerEnter={warmFirebase}
                  onFocus={warmFirebase}
                  onClick={() => void popupSignIn('github')}
                >
                  <span className="flex items-center gap-2">
                    <HugeiconsIcon icon={GithubIcon} className="h-4 w-4" />
                    Continue with GitHub
                  </span>
                </Button>
              </div>
              {signInError && (
                <p
                  role="alert"
                  className="max-w-xs text-sm text-red-600 dark:text-red-400 text-center"
                >
                  {signInError}
                </p>
              )}
              <JoinOrSeparator />
              {/* The link returns here; the shared auth store then shows the details step. */}
              <EmailLinkSignIn
                label={EMAIL_LABEL}
                placeholder="you@example.com"
                contactEmail="contact@uuais.com"
                alternative="continue with Google or GitHub"
                onSignedIn={() => ensureAuth()}
              />
            </CardContent>
          </Card>
        ) : profileLoading ? (
          <SkeletonRegion label="Loading your account…">
            <DetailsStepSkeleton email={user?.email} />
          </SkeletonRegion>
        ) : profileError ? (
          <Card>
            <CardContent className="space-y-3 pt-6 text-center">
              <p role="alert" className="text-gray-800 dark:text-gray-200">
                We couldn&apos;t load your account. This is usually a connection
                problem, and we&apos;ll keep trying.
              </p>
              <Button variant="outline" onClick={() => void refreshProfile()}>
                Try again now
              </Button>
            </CardContent>
          </Card>
        ) : created ? (
          <p
            role="status"
            className="text-center text-gray-800 dark:text-gray-200"
          >
            Account created. Taking you {redirect ? 'back' : 'to your account'}…
          </p>
        ) : completed ? (
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                You&apos;re already a member
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Signed in as{' '}
                {profile?.displayName || profile?.name || user?.email}.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {redirect && (
                <Button asChild variant="default">
                  <Link href={redirect}>Continue</Link>
                </Button>
              )}
              <Button asChild variant={redirect ? 'outline' : 'default'}>
                <Link href="/account">Go to my account</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <DetailsHeader email={user?.email} headingRef={formHeadingRef} />
            <CardContent>
              <form onSubmit={handleCreate} noValidate className="space-y-5">
                <div>
                  <FieldGroup
                    label={JOIN_LABELS.name[0]}
                    requiredHint={JOIN_LABELS.name[1]}
                  >
                    <InputBase
                      ref={nameRef}
                      maxLength={100}
                      autoComplete="name"
                      placeholder="e.g. Alex Doe"
                      required
                      aria-required="true"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      value={draft.name}
                      onChange={(e) => {
                        update({ name: e.target.value });
                        if (errors.name)
                          setErrors((x) => ({ ...x, name: undefined }));
                      }}
                    />
                  </FieldGroup>
                  {errors.name && (
                    <p
                      id="name-error"
                      className="mt-1 text-sm text-red-600 dark:text-red-400"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                <FieldGroup label={JOIN_LABELS.status[0]}>
                  <SelectBase
                    value={draft.studentStatus}
                    onChange={(e) =>
                      update({
                        studentStatus: e.target.value as Draft['studentStatus'],
                      })
                    }
                  >
                    <option value="student">Student</option>
                    <option value="alumni">Alumni</option>
                    <option value="other">Something else</option>
                  </SelectBase>
                </FieldGroup>

                {draft.studentStatus === 'student' && (
                  <FieldGroup
                    label={JOIN_LABELS.program[0]}
                    requiredHint={JOIN_LABELS.program[1]}
                  >
                    <InputBase
                      // The Firestore rules cap this at 150 characters.
                      maxLength={150}
                      placeholder="e.g. Computer Science"
                      value={draft.program}
                      onChange={(e) => update({ program: e.target.value })}
                    />
                  </FieldGroup>
                )}

                <FieldGroup
                  label={JOIN_LABELS.heard[0]}
                  requiredHint={JOIN_LABELS.heard[1]}
                >
                  <SelectBase
                    value={draft.heardSource}
                    onChange={(e) => update({ heardSource: e.target.value })}
                  >
                    <option value="">Select an option</option>
                    {HEARD_OF_US.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectBase>
                </FieldGroup>
                {isReferralSource(draft.heardSource) && (
                  <FieldGroup label="Who told you?" requiredHint="Optional">
                    <InputBase
                      maxLength={200}
                      placeholder="Their name"
                      value={draft.referredBy}
                      onChange={(e) => update({ referredBy: e.target.value })}
                    />
                  </FieldGroup>
                )}
                {draft.heardSource === 'other' && (
                  <FieldGroup label="Where?" requiredHint="Optional">
                    <InputBase
                      maxLength={200}
                      placeholder="Type here"
                      value={draft.heardOther}
                      onChange={(e) => update({ heardOther: e.target.value })}
                    />
                  </FieldGroup>
                )}

                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-2 text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={draft.newsletter}
                      onChange={(e) => update({ newsletter: e.target.checked })}
                    />
                    <span>{NEWSLETTER_CONSENT}</span>
                  </label>
                  <div>
                    <label className="flex items-start gap-2 text-gray-800 dark:text-gray-200">
                      <input
                        ref={privacyRef}
                        type="checkbox"
                        className="mt-1"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(errors.privacy)}
                        aria-describedby={
                          errors.privacy ? 'privacy-error' : undefined
                        }
                        checked={privacyAccepted}
                        onChange={(e) => {
                          setPrivacyAccepted(e.target.checked);
                          if (e.target.checked)
                            setErrors((x) => ({ ...x, privacy: undefined }));
                        }}
                      />
                      <PrivacyConsent />
                    </label>
                    {errors.privacy && (
                      <p
                        id="privacy-error"
                        className="mt-1 text-sm text-red-600 dark:text-red-400"
                      >
                        {errors.privacy}
                      </p>
                    )}
                  </div>
                </div>

                {saveError && (
                  <p
                    role="alert"
                    className="text-sm text-red-600 dark:text-red-400"
                  >
                    {saveError}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="default"
                  fullWidth
                  isLoading={saving}
                >
                  {saving ? 'Creating your account…' : 'Create my account'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <DiscordCta variant="panel" />
      </div>
    </div>
  );
};

export default JoinPage;
