import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        elevated: 'shadow-md',
        outline: 'border-2',
        ghost: 'border-transparent shadow-none',
      },
      hover: {
        true: 'hover:shadow-lg hover:-translate-y-0.5',
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

export const CardMedia: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ className = '', alt, ...props }) => (
  // Consumer can use Next/Image; this is a simple fallback for plain img usage
  <img className={cn('w-full rounded-t-lg object-cover', className)} alt={alt ?? ''} {...props} />
);