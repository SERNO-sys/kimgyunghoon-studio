import type { LabelHTMLAttributes } from 'react';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      className={`mb-1.5 block text-sm font-medium text-stone-700 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
