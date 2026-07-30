'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-stone max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...props}
              className="my-4 max-h-[500px] w-auto rounded-md object-contain"
              alt={props.alt ?? 'image'}
            />
          ),
          a: ({ children, ...props }) => (
            <a {...props} className="text-amber-800 hover:underline">
              {children as ReactNode}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
