'use client';

import type { ReactNode } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import HeroSplash from '@/components/HeroSplash';
import MultiStepWizard, { WizardStep } from '@/components/ui/MultiStepWizard';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';

// Shared by the team application page and its loading skeleton, so the skeleton
// has the page's exact geometry. Kept apart from the page so the route's
// loading state doesn't wait for the whole application form to download.

export const WIZARD_STEPS: WizardStep[] = [
  { key: 'overview', title: 'Overview' },
  { key: 'profile', title: 'Your Profile' },
  { key: 'experience', title: 'Experience' },
  { key: 'roles', title: 'Role Selection' },
  { key: 'review', title: 'Review' },
];

export const TEAM_PAGE_CLASS =
  'min-h-screen bg-background transition-colors duration-300';
export const WIZARD_SECTION_CLASS =
  'scroll-mt-24 py-12 bg-background min-h-screen';

/** The full campaign hero shown on the overview step. */
export const CampaignHero = ({
  subtitle,
  title,
  description,
  deadline,
  badge,
}: {
  subtitle: ReactNode;
  title: ReactNode;
  description: ReactNode;
  deadline: ReactNode;
  /** Shown above the title, e.g. the Draft marker in an admin preview. */
  badge?: ReactNode;
}) => (
  <HeroSplash className="min-h-[50vh]">
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
      {badge}
      <p className="mono-label text-current/65 mb-6">{subtitle}</p>
      <h1 className="display-lg mb-6">{title}</h1>
      <p className="text-base sm:text-lg text-current/60 mb-6 max-w-2xl leading-relaxed">
        {description}
      </p>
      <div className="flex items-center gap-2 text-current/65">
        <Clock className="h-5 w-5" />
        <span>Application deadline: {deadline}</span>
      </div>
      <a
        href="#wizard"
        className="inline-block mt-10 motion-safe:animate-bounce"
        aria-label="Skip to application form"
      >
        <ChevronDown className="h-7 w-7 text-current/30" aria-hidden />
      </a>
    </div>
  </HeroSplash>
);

export const LookingFor = () => (
  <div>
    <h2 className="text-2xl font-bold text-foreground mb-3">
      Who we&apos;re looking for
    </h2>
    <p className="text-muted-foreground leading-relaxed">
      We are looking for passionate students curious about AI, willing to learn,
      and excited to contribute to the community to join us. No prior experience
      is required your enthusiasm and willingness to grow are what matter most.
    </p>
  </div>
);

export const OpenRolesHead = ({ single = false }: { single?: boolean }) => (
  <h3 className="text-lg font-semibold text-foreground mb-4">
    {single ? 'Open Role' : 'Open Roles'}
  </h3>
);

const noop = () => {};

/** One team card on the overview step: icon, name, description, then a role. */
const TeamCardSkeleton = () => (
  <Card variant="default" className="group">
    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <SkeletonBox className="shrink-0 w-11 h-11 rounded-lg" />
        <div className="flex-1 min-w-0">
          <SkeletonText className="font-semibold" widths={['40%']} />
          <SkeletonText className="text-sm mt-1 max-w-[65ch]" lines={2} />
        </div>
      </div>
      <div className="mt-5">
        <SkeletonText className="text-sm font-semibold" widths={['30%']} />
        <SkeletonText className="text-sm mt-1.5 max-w-[65ch]" lines={2} />
      </div>
    </div>
  </Card>
);

/**
 * The application page while the open campaign loads: the campaign hero and
 * the overview step, with the wizard's real step bar.
 */
export const TeamApplicationSkeleton = ({
  label = 'Loading campaigns…',
}: {
  label?: string;
}) => (
  <SkeletonRegion label={label} className={TEAM_PAGE_CLASS}>
    {/* The step bar and overview copy are the page's own; inert keeps them out of reach until it loads. */}
    <div inert>
      <CampaignHero
        subtitle={<SkeletonText className="inline-block" widths={['10rem']} />}
        title={<SkeletonText widths={['min(24rem, 80%)']} />}
        description={
          // A sentence or two: three lines on a phone, two from sm up.
          <>
            <SkeletonText className="sm:hidden" lines={3} />
            <SkeletonText className="hidden sm:block" lines={2} />
          </>
        }
        deadline={<SkeletonText className="inline-block" widths={['6rem']} />}
      />
      <div className={WIZARD_SECTION_CLASS}>
        <MultiStepWizard
          steps={WIZARD_STEPS}
          currentStep={0}
          onNext={noop}
          onBack={noop}
          onSubmit={noop}
        >
          <div className="space-y-6">
            <LookingFor />
            <div>
              <OpenRolesHead />
              <div className="grid gap-4 grid-cols-1">
                <TeamCardSkeleton />
                <TeamCardSkeleton />
              </div>
            </div>
          </div>
        </MultiStepWizard>
      </div>
    </div>
  </SkeletonRegion>
);
