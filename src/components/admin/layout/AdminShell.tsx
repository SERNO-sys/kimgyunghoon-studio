'use client';

import { useState } from 'react';
import { ToastProvider } from '@/components/admin/notifications/ToastProvider';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

interface AdminShellProps {
  children: React.ReactNode;
  siteName?: string;
  siteUrl?: string;
  siteId?: string;
}

export function AdminShell({ children, siteName, siteUrl, siteId }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f8f5ed]">
        <AdminSidebar
          isOpen={isSidebarOpen}
          siteName={siteName}
          onToggle={() => setIsSidebarOpen((current) => !current)}
        />
        <AdminHeader
          siteUrl={siteUrl}
          siteId={siteId}
          onMenuToggle={() => setIsSidebarOpen((current) => !current)}
        />

        <main className="pt-16 lg:ml-64">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
