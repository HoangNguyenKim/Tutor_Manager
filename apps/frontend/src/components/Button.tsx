import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const button = cva(
  'tm-button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4',
  {
    variants: {
      variant: {
        primary: 'tm-button-primary',
        secondary: 'tm-button-secondary border',
        ghost: 'tm-button-ghost',
        danger: 'tm-button-danger',
      },
      size: { sm: 'min-h-9 px-3 py-1.5', md: 'min-h-11 px-4 py-2.5', icon: 'size-11' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}
export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ variant, size }), className)} {...props} />;
}
