import type { ShowcaseCategory } from '@/types';

const GRADIENTS: Record<ShowcaseCategory, [string, string]> = {
  app: ['#7c3aed', '#c084fc'],
  website: ['#db2777', '#f9a8d4'],
  github: ['#dc2626', '#fb923c'],
  model: ['#0ea5e9', '#a5f3fc'],
  video: ['#d97706', '#fcd34d'],
  research: ['#16a34a', '#86efac'],
  demo: ['#2563eb', '#93c5fd'],
  other: ['#475569', '#cbd5e1'],
};

export default function ShowcaseCover({
  category,
  title = '',
  image,
  className,
  scanlines = true,
}: {
  category: ShowcaseCategory;
  title?: string;
  image?: string;
  className?: string;
  scanlines?: boolean;
}) {
  const [from, to] = GRADIENTS[category] ?? GRADIENTS.other;
  const glyph = (title || '').trim().slice(0, 2).toUpperCase() || '·';
  const bg = image
    ? `url(${image}) center/cover no-repeat`
    : `linear-gradient(135deg, ${from}, ${to})`;
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`} style={{ background: bg }}>
      {!image && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold tracking-wide text-white/90">
          {glyph}
        </span>
      )}
      {scanlines && (
        <span className="absolute inset-0 [background-image:linear-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)] [background-size:100%_5px]" />
      )}
    </div>
  );
}
