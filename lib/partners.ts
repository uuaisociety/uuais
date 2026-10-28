// Single source for the partners page and the footer strip.
// Alpha and Beta are partnership levels; Gamma lists companies we have run events
// with but have no partnership with, shown as collaborators.
// Logos are dark-on-transparent; consumers invert them in dark mode. `width` and
// `height` are the logo file's own, tightly cropped dimensions.

export type PartnerTier = 'alpha' | 'beta' | 'gamma';

export interface Partner {
  name: string;
  href: string;
  logo: string;
  width: number;
  height: number;
  /** Area multiplier for logos whose ink density reads lighter or heavier than their box. */
  optical?: number;
  tier: PartnerTier;
  blurb?: string;
}

// `symbol` is the visible tier mark; `label` is its English name wherever text is
// needed (screen readers, running copy). `noun` is [singular, plural].
export const tiers: {
  id: PartnerTier;
  symbol: string;
  label: string;
  noun: [string, string];
  blurb: string;
}[] = [
  {
    id: 'alpha',
    symbol: 'α',
    label: 'Alpha',
    noun: ['partner', 'partners'],
    blurb:
      'Our principal partner, supporting the society across the academic year.',
  },
  {
    id: 'beta',
    symbol: 'β',
    label: 'Beta',
    noun: ['partner', 'partners'],
    blurb: 'Partners who support a series of our events and programmes.',
  },
  {
    id: 'gamma',
    symbol: 'γ',
    label: 'Gamma',
    noun: ['collaborator', 'collaborators'],
    blurb:
      'A selection of companies we have had previous events or partnerships with.',
  },
];

export const partners: Partner[] = [
  {
    name: 'Jane Street',
    href: 'https://www.janestreet.com/',
    logo: '/images/partners/jane-street.svg',
    width: 314,
    height: 87,
    tier: 'alpha',
    blurb:
      'A quantitative trading firm and liquidity provider with offices around the world.',
  },
  {
    name: 'Uppsala Kommun',
    href: 'https://www.uppsala.se/',
    logo: '/images/partners/uppsala-kommun-trim.png',
    width: 664,
    height: 240,
    optical: 1.6,
    tier: 'gamma',
  },
  {
    name: 'Thalamind',
    href: 'https://www.thalamind.com/',
    logo: '/images/partners/thalamind-trim.png',
    width: 939,
    height: 240,
    optical: 1.7,
    tier: 'gamma',
  },
  {
    name: 'Vantel',
    href: 'https://www.vantel.com/',
    logo: '/images/partners/vantel-trim.png',
    width: 865,
    height: 160,
    optical: 0.8,
    tier: 'gamma',
  },
  {
    name: 'Voi',
    href: 'https://www.voi.com/',
    logo: '/images/partners/voi-black.png',
    width: 578,
    height: 240,
    optical: 0.55,
    tier: 'gamma',
  },
  {
    name: 'Arkyv',
    href: 'https://www.arkyv.ai/',
    logo: '/images/partners/arkyv-black.svg',
    width: 930,
    height: 337,
    tier: 'gamma',
  },
  {
    name: 'Fyris',
    href: 'https://www.fyris.ai/',
    logo: '/images/partners/fyris-trim.png',
    width: 392,
    height: 168,
    tier: 'gamma',
  },
];

export const partnersInTier = (tier: PartnerTier) =>
  partners.filter((p) => p.tier === tier);

// Equal-area sizing: wide wordmarks render shorter and compact marks taller,
// so a row of logos reads as one weight instead of a shouting match.
export const logoBox = (p: Partner, baseArea: number) => {
  const ratio = p.width / p.height;
  const area = baseArea * (p.optical ?? 1);
  // Height follows the rounded width so the box keeps the file's exact ratio.
  // Pinning both in `style` stops the browser re-deriving one of them from the
  // file's ratio and rendering a pixel off the declared size.
  const width = Math.round(Math.sqrt(area * ratio));
  const height = Math.round(width / ratio);
  return { width, height, style: { width, height } };
};
