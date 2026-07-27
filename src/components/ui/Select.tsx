import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`flex h-11 w-full rounded-sm border border-stone-300 bg-[#fffdf8] px-3 py-2 text-sm text-stone-900 transition-colors focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
