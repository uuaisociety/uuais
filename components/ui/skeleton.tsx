'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

// Page skeletons: placeholders that take the finished page's exact geometry, so
// nothing moves when the content arrives. Bars use the surrounding text colour
// (`bg-current`), so they follow the hero band's tone as well as the page's.
// The pulse stops under prefers-reduced-motion (globals.css caps every animation).

const BAR = 'rounded-sm bg-current/10 animate-pulse';

/**
 * Stands in for text. Pass the real text's type classes (e.g. `display-lg mb-4`,
 * `text-sm`, `mono-meta`): each line is a line box of that style holding a bar,
 * so the placeholder is exactly as tall as the text it replaces.
 * `widths[i]` sizes line i's bar (any CSS width); lines without one are full
 * width. By default the last line of a paragraph is shorter.
 */
function SkeletonText({
  className,
  lines = 1,
  widths = lines > 1 ? [...Array(lines - 1).fill('100%'), '60%'] : ['60%'],
}: {
  className?: string;
  lines?: number;
  widths?: string[];
}) {
  return (
    <span
      aria-hidden
      data-slot="skeleton-text"
      className={cn('block', className)}
    >
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="flex items-center">
          {/* A zero-width space gives the line its real line-height. */}
          &#8203;
          <span
            className={cn('h-[0.7em]', BAR)}
            style={{ width: widths[i] ?? '100%' }}
          />
        </span>
      ))}
    </span>
  );
}

/** A filled block for anything that isn't text: images, inputs, buttons. Size it with `className`. */
function SkeletonBox({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-slot="skeleton-box"
      className={cn('block bg-current/[0.06] animate-pulse', className)}
    />
  );
}

/**
 * The loading container: `aria-busy`, with one short screen-reader status
 * (`label`). Give it the page wrapper's classes so it lays out like the page.
 */
function SkeletonRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div aria-busy="true" data-slot="skeleton-region" className={className}>
      <span role="status" className="sr-only">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * The site's media card while it loads: the 16:10 image, a title, a two-line
 * excerpt and a meta footer on a hairline. `className` is the real card's shell.
 * Pass `children` to replace the body when a card's layout differs.
 */
function CardSkeleton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div aria-hidden data-slot="card-skeleton" className={className}>
      <SkeletonBox className="aspect-[16/10]" />
      {children ?? (
        <div className="flex flex-col flex-1 p-5">
          <SkeletonText
            className="text-[1.0625rem] leading-snug mb-2"
            widths={['75%']}
          />
          <SkeletonText className="text-sm leading-relaxed mb-5" lines={2} />
          <div className="mt-auto pt-4 border-t border-border">
            <SkeletonText className="mono-meta" widths={['45%']} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders `children` only after `ms`, so a fast load never flashes a placeholder
 * that pops in and out. Use it where the placeholder can't match the page.
 */
function Delayed({ ms = 150, children }: { ms?: number; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return visible ? children : null;
}

export {
  Skeleton,
  SkeletonText,
  SkeletonBox,
  SkeletonRegion,
  CardSkeleton,
  Delayed,
};
