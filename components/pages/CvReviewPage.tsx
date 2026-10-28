import React from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import PartnerEmailSignIn from '@/components/auth/PartnerEmailSignIn';
import UseDifferentEmailButton from '@/components/auth/UseDifferentEmailButton';
import PartnerNotFound from '@/components/auth/PartnerNotFound';
import DownloadAllCvsButton from '@/components/partners/DownloadAllCvsButton';
import type { SharedCv } from '@/lib/export-cvs';

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

type Props =
  | { access: 'granted'; cvs: SharedCv[] }
  | { access: 'denied' | 'signin'; cvs?: never };

export default function CvReviewPage({ access, cvs = [] }: Props) {
  return (
    <div className="bg-background min-h-screen pt-24 sm:pt-28 pb-24 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <p className="mono-label text-muted-foreground mb-4">Partner access</p>
        <h1 className="display-lg mb-4">
          Member <span className="paren">(CVs)</span>
        </h1>

        {access === 'signin' ? (
          <>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mb-8">
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
                <Link href="/partners">Back to partners</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
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
