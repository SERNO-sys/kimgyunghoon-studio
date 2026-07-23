import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-stone-950 text-stone-50 hover:bg-stone-800',
  secondary: 'border border-stone-300 bg-transparent text-stone-900 hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-100 hover:text-stone-950',
};

export function Button({ children, className = '', type = 'button', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-sm px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
