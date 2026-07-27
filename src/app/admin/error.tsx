'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface AdminErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminErrorBoundary({
  error,
  reset,
}: AdminErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h2 className="font-serif text-2xl font-semibold text-stone-950">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-stone-600">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
