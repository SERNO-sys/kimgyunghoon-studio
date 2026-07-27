import { Loader2 } from 'lucide-react';

interface AdminLoadingProps {
  message?: string;
}

export function AdminLoading({ message = 'Loading...' }: AdminLoadingProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <Loader2
        className="size-8 animate-spin text-amber-900"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-medium text-stone-600">{message}</p>
    </div>
  );
}
