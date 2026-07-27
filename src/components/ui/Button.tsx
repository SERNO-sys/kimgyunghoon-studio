import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'sm' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  href?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-stone-950 text-stone-50 hover:bg-stone-800',
  secondary: 'border border-stone-300 bg-transparent text-stone-900 hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-100 hover:text-stone-950',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'min-h-11 px-5 py-2.5',
  sm: 'h-8 px-3 text-xs',
  icon: 'size-8 p-0',
};

export function Button({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  size = 'default',
  asChild,
  href,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-sm text-sm font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:pointer-events-none disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  if (asChild && href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
