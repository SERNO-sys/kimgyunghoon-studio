import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

const toastStyles: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-amber-200 bg-amber-50 text-amber-900',
};

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-sm border p-4 shadow-lg ${toastStyles[toast.type]}`}
      role="alert"
    >
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-black/5"
        aria-label="Close notification"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
