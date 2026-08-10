import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import Image, { type ImageProps } from 'next/image';

const cardVariants = cva(
  'relative rounded-xl text-card-foreground overflow-hidden',
  {
    variants: {
      variant: {
        // Hairline over the ambient background — the quiet editorial default.
        default: 'border border-border bg-card/70 backdrop-blur-[2px]',
        glass: 'glass',
        elevated: 'border border-border bg-card shadow-[var(--glass-shadow)]',
        outline: 'border border-foreground/20 bg-transparent',
        ghost: 'border-transparent bg-transparent',
      },
      hover: {
        true: 'glass-interactive',
        false: '',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
      padding: 'none',
    },
  }
);

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card: React.FC<CardProps> = ({ className, variant, hover, padding, ...props }) => {
  return <div className={cn(cardVariants({ variant, hover, padding }), className)} {...props} />;
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={cn('p-6 pb-4', className)} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

type CardMediaProps = Omit<ImageProps, 'alt' | 'className'> & {
  alt?: string;
  className?: string;
};

export const CardMedia: React.FC<CardMediaProps> = ({ className = '', alt = '', fill, width, height, sizes, priority, ...rest }) => {
  // Provide sensible defaults if neither fill nor explicit dimensions provided
  const useDefaults = !fill && (!width || !height);
  const w = useDefaults ? 1200 : width;
  const h = useDefaults ? 675 : height;
  const sz = sizes || (fill ? '(min-width: 1024px) 800px, 100vw' : '100vw');

  if (fill) {
    return (
      <div className={cn('relative w-full h-48 overflow-hidden', className)}>
        <Image alt={alt} fill sizes={sz} priority={priority} className="object-cover" {...rest} />
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      width={w as number}
      height={h as number}
      sizes={sz}
      priority={priority}
      className={cn('w-full object-cover', className)}
      {...rest}
    />
  );
};