import { ToastProvider } from '@/components/admin/notifications/ToastProvider';

export default function SetupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f5ed] px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </ToastProvider>
  );
}
