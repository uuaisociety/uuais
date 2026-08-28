'use client'

import { useState } from 'react';
import Image from 'next/image';

/** Initials in code points: indexing a string splits an emoji's surrogate pair into a replacement glyph. */
function initialsFor(title: string): string {
  return Array.from(
    (title || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => Array.from(word)[0] ?? '')
      .join(''),
  )
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** A project's cover, or initials over the muted ground when there is none or the upload has gone missing. */
export default function ShowcaseCover({
  title = '',
  image,
  className,
  sizes = '(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw',
  priority = false,
}: {
  title?: string;
  image?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  // Storage objects outlive their references; a deleted upload otherwise leaks its alt text.
  const [failed, setFailed] = useState(false);
  const initials = initialsFor(title);

  if (image && !failed) {
    return (
      <div className={`relative overflow-hidden bg-muted ${className ?? ''}`}>
        <Image
          src={image}
          alt={`${title} project cover`}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      </div>
    );
  }

  // The initials slab is decorative: on gallery cards it sits inside an already-labelled link, so announcing "no cover image" would be noise.
  return (
    <div className={`relative overflow-hidden bg-muted ${className ?? ''}`}>
      <span
        aria-hidden
        className="absolute inset-0 grid place-items-center text-[clamp(1.75rem,6vw,3rem)] font-semibold tracking-[-0.04em] text-foreground/20"
      >
        {initials || '—'}
      </span>
    </div>
  );
}
