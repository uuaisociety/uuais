import React from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import PartnerEmailSignIn from '@/components/auth/PartnerEmailSignIn';
import UseDifferentEmailButton from '@/components/auth/UseDifferentEmailButton';
import PartnerNotFound from '@/components/auth/PartnerNotFound';
import DownloadAllCvsButton from '@/components/partners/DownloadAllCvsButton';
import type { SharedCv } from '@/lib/export-cvs';
import { PARTNERS_PAGE_PUBLIC } from '@/lib/feature-flags';
import { SkeletonRegion, SkeletonText } from '@/components/ui/skeleton';

// Member (name + email) | Programme | Graduates | Shared | PDF
const COLUMNS =
  'md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5.5rem_7.5rem_4.75rem]';

// Rendered on the server, so pin the zone instead of inheriting the host's.
const formatDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Stockholm',
      })
    : '—';

// Shared by the page and its loading skeleton.
const PAGE =
  'bg-background min-h-screen pt-24 sm:pt-28 pb-24 transition-colors duration-300';
const COLUMN = 'max-w-4xl mx-auto px-5 sm:px-8';
const LEDE = 'text-muted-foreground leading-relaxed max-w-2xl';

const CvReviewHeader = () => (
  <>
    <p className="mono-label text-muted-foreground mb-4">Partner access</p>
    <h1 className="display-lg mb-4">
      Member <span className="paren">(CVs)</span>
    </h1>
  </>
);

/** While the session and the list load: the heading and the opening paragraph
 * (the same length signed in or out). What follows depends on access, so it
 * renders below without moving anything above it. */
export const CvReviewSkeleton = () => (
  <SkeletonRegion label="Loading…" className={PAGE}>
    <div className={COLUMN}>
      <CvReviewHeader />
      <div className={LEDE}>
        {/* Two lines wide, three on a phone. */}
        <SkeletonText lines={2} widths={['100%', '100%']} />
        <SkeletonText className="sm:hidden" />
      </div>
    </div>
  </SkeletonRegion>
);

type Props =
  | { access: 'granted'; cvs: SharedCv[] }
  | { access: 'denied' | 'signin'; cvs?: never };

export default function CvReviewPage({ access, cvs = [] }: Props) {
  return (
    <div className={PAGE}>
      <div className={COLUMN}>
        <CvReviewHeader />

        {access === 'signin' ? (
          <>
            <p className={`${LEDE} mb-8`}>
              Sign in with the work email your company&apos;s partnership with
              UU AI Society is registered to. We&apos;ll email you a one-time
              sign-in link.
            </p>
            <PartnerEmailSignIn />
          </>
        ) : access === 'denied' ? (
          <>
            {/* Signed in, but neither an admin nor on the partner allowlist. */}
            <PartnerNotFound className="max-w-2xl mb-8" />
            <div className="flex flex-wrap gap-3">
              <UseDifferentEmailButton />
              <Button asChild variant="ghost">
                {PARTNERS_PAGE_PUBLIC ? (
                  <Link href="/partners">Back to partners</Link>
                ) : (
                  <Link href="/">Back to home</Link>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className={`${LEDE} mb-10`}>
              Members who chose to share their CV with our partners. Every
              download is logged. Use CVs only for recruitment, and delete
              copies you no longer need.
            </p>

            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <span className="mono-meta text-muted-foreground pt-1.5">
                {cvs.length} {cvs.length === 1 ? 'CV' : 'CVs'}
              </span>
              {cvs.length > 0 && <DownloadAllCvsButton cvs={cvs} />}
            </div>

            <div
              aria-hidden
              className={`grid ${COLUMNS} gap-x-6 border-b-2 border-foreground pb-3 mono-label text-muted-foreground`}
            >
              <span>Member</span>
              <span className="hidden md:block">Programme</span>
              <span className="hidden md:block">Graduates</span>
              <span className="hidden md:block">Shared</span>
            </div>

            {cvs.length === 0 ? (
              <p className="py-10 text-muted-foreground border-b border-border">
                No members have shared a CV yet.
              </p>
            ) : (
              <ul>
                {cvs.map((cv) => {
                  const studies = [
                    cv.program,
                    cv.graduationYear && `Graduates ${cv.graduationYear}`,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <li
                      key={cv.uid}
                      className={`grid grid-cols-[minmax(0,1fr)_auto] ${COLUMNS} items-center gap-x-6 gap-y-1 py-4 border-b border-border`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {cv.name}
                        </p>
                        {cv.email && (
                          <a
                            href={`mailto:${cv.email}`}
                            className="block mono-meta text-muted-foreground truncate hover:text-foreground transition-colors duration-300"
                          >
                            {cv.email}
                          </a>
                        )}
                        {studies && (
                          <p className="md:hidden mt-1 text-sm text-muted-foreground truncate">
                            {studies}
                          </p>
                        )}
                      </div>
                      <span
                        className="hidden md:block text-sm text-muted-foreground truncate"
                        title={cv.program || undefined}
                      >
                        <span className="sr-only">Programme: </span>
                        {cv.program || '—'}
                      </span>
                      <span className="hidden md:block mono-meta text-muted-foreground">
                        <span className="sr-only">Expected graduation: </span>
                        {cv.graduationYear ?? '—'}
                      </span>
                      <span className="hidden md:block mono-meta text-muted-foreground">
                        <span className="sr-only">Shared </span>
                        {formatDate(cv.consentAt)}
                      </span>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        icon={Download}
                        className="justify-self-end"
                      >
                        <a
                          href={`/api/cvs?uid=${encodeURIComponent(cv.uid)}`}
                          aria-label={`Download ${cv.name}'s CV`}
                        >
                          PDF
                        </a>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
