import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-sm border border-stone-200 bg-[#fffdf8] p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
