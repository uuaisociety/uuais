import React from 'react';
import { cn } from '@/lib/utils';

/** Shown when an email is neither an admin nor on the partner allowlist. */
export default function PartnerNotFound({ className }: { className?: string }) {
  return (
    <p className={cn('text-muted-foreground leading-relaxed', className)}>
      Your email was not found among our approved partnerships. Please try a
      different email or contact us at{' '}
      <a
        href="mailto:partnerships@uuais.com"
        className="text-foreground underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground transition-colors duration-300"
      >
        partnerships@uuais.com
      </a>{' '}
      if you believe this is an error.
    </p>
  );
}
