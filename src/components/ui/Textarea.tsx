import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`flex min-h-24 w-full rounded-sm border border-stone-300 bg-[#fffdf8] px-3 py-2 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
