import type { HTMLAttributes, ReactNode } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function Badge({ children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-800/20 bg-amber-50 px-2.5 py-1 text-xs font-medium tracking-wide text-amber-950 ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
