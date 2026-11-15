import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { joinUrl, loginUrl } from '@/lib/login-redirect';

// The small member card shared by /newsletter and /guess, and by their loading
// skeletons, so a skeleton has the page's exact geometry.

export const MemberCard = ({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) => (
  <section className="mx-auto max-w-xl px-4 pt-8 pb-12 sm:px-6 sm:py-28">
    <div className="rounded-xl border border-border bg-card/70 p-5 glass-shadow sm:p-8">
      <p className="mono-label text-muted-foreground">UU AI SOCIETY</p>
      <h1 className="display-lg mt-3">{title}</h1>
      {children}
    </div>
  </section>
);

/** What a signed-out visitor sees: why to log in, then Log in and Create an account. */
export const SignInPrompt = ({
  text,
  returnPath,
}: {
  text: ReactNode;
  returnPath: string;
}) => (
  <div className="mt-8">
    <p className="text-base text-muted-foreground sm:text-sm">{text}</p>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href={loginUrl(returnPath)}>Log in</Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
        <Link href={joinUrl(returnPath)}>Create an account</Link>
      </Button>
    </div>
  </div>
);

/** The section under the intro once the member is known: a hairline, then the content. */
export const MEMBER_BODY_CLASS = 'mt-8 border-t border-border pt-6';
