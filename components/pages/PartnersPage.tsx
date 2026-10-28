import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import HeroSplash from '@/components/HeroSplash';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  logoBox,
  partnersInTier,
  tiers,
  type Partner,
  type PartnerTier,
} from '@/lib/partners';

// An annual-report ledger: one ruled row per partner, and each step down the
// stack shrinks the row, so rank reads from scale alone. Alpha and Beta stay
// still with a set logo height and blurb. Alpha is the lead entry: a heavier
// ink rule, a larger logo and larger copy, so the principal partner stands apart
// without a box. Gamma is a marquee of logos
// that share one area, so mixed wordmarks balance.
const sizes: Record<
  PartnerTier,
  | { kind: 'featured'; logo: string; prominent: boolean }
  | { kind: 'marquee'; area: number }
> = {
  alpha: { kind: 'featured', logo: 'h-16 sm:h-28', prominent: true },
  beta: { kind: 'featured', logo: 'h-11', prominent: false },
  gamma: { kind: 'marquee', area: 2000 },
};

// A marquee copy narrower than the column would show a gap before it loops, so
// short lists repeat within each copy until a copy outruns the column width.
const MARQUEE_MIN_ITEMS = 12;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const arrowClass =
  'transition-color transition-transform duration-100 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5';

const hostOf = (href: string) => new URL(href).hostname.replace(/^www\./, '');

const linkProps = (p: Partner) => ({
  href: p.href,
  target: '_blank',
  rel: 'noopener noreferrer',
  'aria-label': `${p.name} (opens in a new tab)`,
});

const FeaturedRow: React.FC<{
  partner: Partner;
  logo: string;
  className?: string;
  blurbClassName?: string;
  /** Above the fold (the lead entry), so load it with the page, not lazily. */
  eager?: boolean;
}> = ({
  partner,
  logo,
  className = 'py-6 sm:py-10',
  blurbClassName = 'text-muted-foreground',
  eager = false,
}) => (
  <a
    {...linkProps(partner)}
    className={cn(
      'group grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] items-center gap-4 sm:gap-6 md:gap-12 p-2 transition-colors duration-300 hover:bg-foreground/[0.03]',
      focusRing,
      className,
    )}
  >
    <Image
      src={partner.logo}
      alt=""
      width={partner.width}
      height={partner.height}
      loading={eager ? 'eager' : 'lazy'}
      className={cn(
        'w-auto max-w-full justify-self-start dark:brightness-0 dark:invert',
        logo,
      )}
    />
    {partner.blurb && (
      <p className={cn('leading-relaxed max-w-md', blurbClassName)}>
        {partner.blurb}
      </p>
    )}
    <span className="mono-meta inline-flex items-center gap-1.5 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
      {hostOf(partner.href)}
      <ArrowUpRight className={cn('h-3.5 w-3.5', arrowClass)} aria-hidden />
    </span>
  </a>
);

const MarqueeItem: React.FC<{
  partner: Partner;
  area: number;
  repeat: boolean;
}> = ({ partner, area, repeat }) => (
  // Repeats exist only to fill the loop: hidden from assistive tech, out of the
  // tab order, and dropped entirely when motion is reduced.
  <li
    aria-hidden={repeat || undefined}
    className={cn('shrink-0', repeat && 'motion-reduce:hidden')}
  >
    <a
      {...linkProps(partner)}
      tabIndex={repeat ? -1 : undefined}
      title={partner.name}
      className={cn('group flex h-16 items-center rounded-sm px-2', focusRing)}
    >
      <Image
        src={partner.logo}
        alt=""
        {...logoBox(partner, area)}
        className="opacity-75 transition-opacity duration-300 group-hover:opacity-100 dark:brightness-0 dark:invert"
      />
    </a>
  </li>
);

const Marquee: React.FC<{ list: Partner[]; area: number }> = ({
  list,
  area,
}) => {
  const fill = Math.max(1, Math.ceil(MARQUEE_MIN_ITEMS / list.length));
  const run = Array.from({ length: fill }, (_, i) =>
    list.map((p) => ({ partner: p, repeat: i > 0 })),
  ).flat();

  const copy = (second: boolean) => (
    <ul
      aria-hidden={second || undefined}
      className={cn(
        'flex shrink-0 items-center gap-x-16 pr-16',
        second
          ? 'motion-reduce:hidden'
          : 'motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-4 motion-reduce:pr-0',
      )}
    >
      {run.map(({ partner, repeat }, i) => (
        <MarqueeItem
          key={`${partner.name}-${i}`}
          partner={partner}
          area={area}
          repeat={second || repeat}
        />
      ))}
    </ul>
  );

  return (
    <div className="overflow-hidden border-y border-border py-6 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:[mask-image:none]">
      <div className="flex w-max animate-marquee motion-reduce:w-full motion-reduce:animate-none">
        {copy(false)}
        {copy(true)}
      </div>
    </div>
  );
};

// An unfilled tier stays on the page as an open slot, in the same ruled row as a
// partner, so the ladder reads complete without inventing a partner.
const OpenSlot: React.FC<{ label: string }> = ({ label }) => (
  <a
    href={`mailto:partnerships@uuais.com?subject=${encodeURIComponent(`${label} partnership`)}`}
    className={cn(
      'group grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] items-center gap-4 sm:gap-6 md:gap-12 py-6 sm:py-10',
      focusRing,
    )}
  >
    <span className="inline-flex h-11 w-44 items-center justify-center justify-self-start rounded-md border border-dashed border-foreground/20 mono-label text-muted-foreground transition-colors duration-300 group-hover:border-foreground/40 group-hover:text-foreground">
      Your logo
    </span>
    <p className="text-muted-foreground leading-relaxed max-w-md">
      This tier is open. Get in touch to talk about what a {label} partnership
      could look like.
    </p>
    <span className="mono-meta inline-flex items-center gap-1.5 text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
      partnerships@uuais.com
      <ArrowUpRight className={cn('h-3.5 w-3.5', arrowClass)} aria-hidden />
    </span>
  </a>
);

const PartnerSection: React.FC<{
  id: string;
  symbol: string;
  label: string;
  title: string;
  description: string;
  tier: PartnerTier;
  list: Partner[];
  spacing?: string;
}> = ({
  id,
  symbol,
  label,
  title,
  description,
  tier,
  list,
  spacing = 'pt-12 sm:pt-16',
}) => {
  const s = sizes[tier];
  return (
    // The symbol is the visual mark; the section is named in words by `aria-label`.
    <section id={id} aria-label={`${label} ${title}`} className={spacing}>
      <h2 className="display-md mb-4">
        <span className="paren" aria-hidden>
          ({symbol})
        </span>{' '}
        {title}
      </h2>
      <p className="text-muted-foreground leading-relaxed max-w-2xl mb-8 sm:mb-10">
        {description}
      </p>
      {list.length === 0 ? (
        <div className="border-y border-border">
          <OpenSlot label={label} />
        </div>
      ) : s.kind === 'marquee' ? (
        <Marquee list={list} area={s.area} />
      ) : s.prominent ? (
        <ul className="grid border-t-2 border-foreground">
          {list.map((p) => (
            <li key={p.name} className="border-b border-border">
              <FeaturedRow
                partner={p}
                logo={s.logo}
                className="py-8 sm:py-12 transition-colors duration-300 hover:bg-foreground/[0.03]"
                blurbClassName="text-base sm:text-lg text-foreground/75"
                eager
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid border-t border-border">
          {list.map((p) => (
            <li key={p.name} className="border-b border-border">
              <FeaturedRow partner={p} logo={s.logo} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default function PartnersPage() {
  // Every tier is always shown; an empty one renders as an open slot.
  const allTiers = tiers.map((t) => ({ ...t, list: partnersInTier(t.id) }));
  const [topTier, ...lowerTiers] = allTiers;

  const tierSection = (t: (typeof allTiers)[number], spacing?: string) => (
    <PartnerSection
      key={t.id}
      id={`tier-${t.id}`}
      symbol={t.symbol}
      label={t.label}
      title={t.noun[t.list.length === 1 ? 0 : 1]}
      description={t.blurb}
      tier={t.id}
      list={t.list}
      spacing={spacing}
    />
  );

  return (
    <div className="bg-background pb-24 transition-colors duration-300">
      <HeroSplash className="-mt-14">
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-[clamp(6rem,12svh,8rem)] pb-[clamp(2.5rem,6svh,5rem)]">
          <p className="mono-label text-current/65 mb-6">
            Uppsala · AI Society
          </p>
          <h1 className="display-lg mb-5">
            Partners.
            <span className="block text-current/60">
              (Who make it possible.)
            </span>
          </h1>
          <p className="text-base sm:text-lg text-current/65 max-w-2xl leading-relaxed">
            The companies and organisations behind our events, workshops, and
            projects for AI students in Uppsala.
          </p>
        </div>
      </HeroSplash>

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* The top tier sits close under the hero so it opens the page. */}
        {topTier && tierSection(topTier, 'pt-[clamp(1.5rem,4.5svh,4rem)]')}
        {lowerTiers.map((t) => tierSection(t))}

        <section
          aria-label="Partner with us"
          className="mt-24 sm:mt-32 pt-16 border-t border-border grid md:grid-cols-[1.4fr_1fr] gap-8 md:items-end"
        >
          <div>
            <h2 className="display-md mb-4">
              <span className="paren">(Partner)</span> with us
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-xl">
              We partner with companies at two levels, Alpha (α) and Beta (β).
              Tell us what you would like to build with Uppsala&apos;s AI
              students and we will find the right fit.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Button asChild size="lg">
              <a href="mailto:partnerships@uuais.com">
                Email partnerships@uuais.com
              </a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
