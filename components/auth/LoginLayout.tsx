import Link from 'next/link';
import { SkeletonBox, SkeletonRegion } from '@/components/ui/skeleton';
import { EmailLinkSignInSkeleton } from '@/components/auth/EmailLinkSignIn';

// Shared by the sign-in form (LoginModal) and its loading skeleton, so the
// skeleton has the form's exact geometry. Kept apart from LoginModal so the
// skeleton doesn't pull in the Firebase SDK.

export const LOGIN_PAGE_CLASS =
  'min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900';
export const LOGIN_COLUMN_CLASS = 'max-w-xs mx-auto px-4';
export const LOGIN_PROVIDERS_CLASS =
  'space-y-3 gap-1 flex flex-col justify-center';

export const LoginHeading = () => (
  <div className="flex flex-col items-center justify-center pb-8">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white pb-2">
      Sign in
    </h1>
    <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
      Use the same method you used when you joined.
    </p>
  </div>
);

export const OrSeparator = () => (
  <div
    role="separator"
    className="flex items-center gap-3 my-5 text-xs text-muted-foreground"
  >
    <span className="h-px flex-1 bg-border" />
    or
    <span className="h-px flex-1 bg-border" />
  </div>
);

export const LoginFooter = ({ joinHref }: { joinHref: string }) => (
  <div className="text-center mt-8">
    <p className="text-sm text-gray-600 dark:text-gray-400">
      New here?{' '}
      <Link href={joinHref} className="underline">
        Join UU AI Society
      </Link>
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
      <Link href="/privacy" className="underline">
        Privacy Policy
      </Link>
      {/* | <Link href="/terms" className="underline">Terms of Service</Link> */}
    </p>
  </div>
);

/** The sign-in form while its page loads: the real heading and texts, with placeholders for the controls. */
export const LoginSkeleton = () => (
  <SkeletonRegion label="Loading sign-in…" className={LOGIN_PAGE_CLASS}>
    {/* The heading and footer are the page's own; inert keeps their links out of reach until it loads. */}
    <div inert className={LOGIN_COLUMN_CLASS}>
      <LoginHeading />
      <div className={LOGIN_PROVIDERS_CLASS}>
        <SkeletonBox className="h-10 rounded-md" />
        <SkeletonBox className="h-10 rounded-md" />
      </div>
      <OrSeparator />
      <EmailLinkSignInSkeleton label="Email" />
      <LoginFooter joinHref="/join" />
    </div>
  </SkeletonRegion>
);
