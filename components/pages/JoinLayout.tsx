import type { ReactNode, Ref } from 'react';
import { CardContent, CardHeader, Card } from '@/components/ui/Card';
import { FieldGroup } from '@/components/ui/Form';
import { FieldBox } from '@/components/ui/FieldSkeleton';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import { EmailLinkSignInSkeleton } from '@/components/auth/EmailLinkSignIn';
import { DiscordCta } from '@/components/common/DiscordCta';

// Shared by the join page and its loading skeletons, so a skeleton has the
// page's exact geometry and nothing jumps when the real content arrives. Kept
// apart from JoinPage so the route's loading state stays light.

export const JOIN_PAGE_CLASS =
  'min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 dark:[color-scheme:dark]';
export const JOIN_COLUMN_CLASS = 'max-w-xl mx-auto px-4 space-y-8';
export const SIGN_IN_CONTENT_CLASS = 'flex flex-col items-center gap-3 pt-4';
export const SIGN_IN_PROVIDERS_CLASS = 'flex w-full max-w-xs flex-col gap-3';
export const EMAIL_LABEL = 'Email (any address, e.g. your student email)';

/** The details form's field labels: [label, hint]. */
export const JOIN_LABELS = {
  name: ['Your name', 'Required'],
  status: ['I am a', undefined],
  program: ['Programme / major', 'Optional'],
  heard: ['How did you hear about us?', 'Optional'],
} as const;
export const NEWSLETTER_CONSENT =
  'Email me the newsletter about events and news';

export const JoinIntro = () => (
  <div className="text-center">
    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
      Join UU AI Society
    </h1>
    <p className="text-gray-600 dark:text-gray-300">
      Free membership for anyone interested in AI. It takes about a minute.
    </p>
  </div>
);

const StepLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
    {children}
  </p>
);

export const CreateAccountHeader = () => (
  <CardHeader>
    <StepLabel>Step 1 of 2</StepLabel>
    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
      Create your account
    </h2>
    <p className="text-gray-600 dark:text-gray-300 text-sm">
      Choose how you want to sign in. Already a member? Sign in the same way and
      we&apos;ll take you to your account.
    </p>
  </CardHeader>
);

export const JoinOrSeparator = () => (
  <div
    role="separator"
    className="flex items-center gap-3 my-3 w-full max-w-xs text-xs text-muted-foreground"
  >
    <span className="h-px flex-1 bg-border" />
    or
    <span className="h-px flex-1 bg-border" />
  </div>
);

export const DetailsHeader = ({
  email,
  headingRef,
}: {
  email: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) => (
  <CardHeader>
    <StepLabel>Step 2 of 2</StepLabel>
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="text-2xl font-semibold text-gray-900 dark:text-white outline-none"
    >
      A few details about you
    </h2>
    <p className="text-gray-600 dark:text-gray-300 text-sm">
      Signed in as {email}. You can add more (LinkedIn, CV, bio) later in your
      account.
    </p>
  </CardHeader>
);

export const PrivacyConsent = () => (
  <span>
    I accept the{' '}
    <a className="underline" href="/privacy" target="_blank" rel="noreferrer">
      privacy policy
    </a>{' '}
    <span className="text-muted-foreground">(required)</span>
  </span>
);

// ------------------------------------------------------------------ skeletons
// The page's own headings and labels, inert, with placeholders for the controls.

/** Step 1 (signed out) while it loads. */
const SignInStepSkeleton = () => (
  <Card inert>
    <CreateAccountHeader />
    <CardContent className={SIGN_IN_CONTENT_CLASS}>
      <div className={SIGN_IN_PROVIDERS_CLASS}>
        <SkeletonBox className="h-10 rounded-md" />
        <SkeletonBox className="h-10 rounded-md" />
      </div>
      <JoinOrSeparator />
      <EmailLinkSignInSkeleton label={EMAIL_LABEL} />
    </CardContent>
  </Card>
);

/** Step 2 (signed in, no finished profile) while it loads. A student is the default, so the programme field shows. */
export const DetailsStepSkeleton = ({ email }: { email?: string | null }) => (
  <Card inert>
    <DetailsHeader
      email={
        email || <SkeletonText className="inline-block" widths={['10rem']} />
      }
    />
    <CardContent>
      <div className="space-y-5">
        {(['name', 'status', 'program', 'heard'] as const).map((key) => (
          <FieldGroup
            key={key}
            label={JOIN_LABELS[key][0]}
            requiredHint={JOIN_LABELS[key][1]}
          >
            <FieldBox />
          </FieldGroup>
        ))}
        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-2 text-gray-800 dark:text-gray-200">
            <input type="checkbox" className="mt-1" tabIndex={-1} />
            <span>{NEWSLETTER_CONSENT}</span>
          </label>
          <div>
            <label className="flex items-start gap-2 text-gray-800 dark:text-gray-200">
              <input type="checkbox" className="mt-1" tabIndex={-1} />
              <PrivacyConsent />
            </label>
          </div>
        </div>
        <SkeletonBox className="h-10 rounded-md" />
      </div>
    </CardContent>
  </Card>
);

/** The whole join page while its route loads: the sign-in step, or the details step for a returning visitor. */
export const JoinSkeleton = ({
  cached,
}: {
  cached?: { email: string | null } | null;
}) => (
  <SkeletonRegion label="Loading…" className={JOIN_PAGE_CLASS}>
    <div className={JOIN_COLUMN_CLASS}>
      <JoinIntro />
      {cached ? (
        <DetailsStepSkeleton email={cached.email} />
      ) : (
        <SignInStepSkeleton />
      )}
      <div inert>
        <DiscordCta variant="panel" />
      </div>
    </div>
  </SkeletonRegion>
);
