import { cn } from '@/lib/utils';

// An empty text field for skeletons: InputBase / SelectBase's box (border,
// padding, inherited font), so it is exactly as tall as the real control.
export const FieldBox = ({ className }: { className?: string }) => (
  <span
    aria-hidden
    className={cn(
      'block w-full rounded-md border border-border bg-card px-3 py-2 shadow-sm',
      className,
    )}
  >
    &#8203;
  </span>
);
