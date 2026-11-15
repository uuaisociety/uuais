// The partners page's hero, shared by the page and its loading state (the
// /partners loading boundary). Kept apart so the boundary doesn't pull in the
// page's partner tiers.

import HeroSplash from '@/components/HeroSplash';

export const PARTNERS_PAGE_CLASS =
  'bg-background pb-24 transition-colors duration-300';

export const PartnersHero = () => (
  <HeroSplash className="-mt-14">
    <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-[clamp(6rem,12svh,8rem)] pb-[clamp(2.5rem,6svh,5rem)]">
      <p className="mono-label text-current/65 mb-6">Uppsala · AI Society</p>
      <h1 className="display-lg mb-5">
        Partners.
        <span className="block text-current/60">(Who make it possible.)</span>
      </h1>
      <p className="text-base sm:text-lg text-current/65 max-w-2xl leading-relaxed">
        The companies and organisations behind our events, workshops, and
        projects for AI students in Uppsala.
      </p>
    </div>
  </HeroSplash>
);
