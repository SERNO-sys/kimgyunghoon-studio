'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Menu } from 'lucide-react';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#fffdf8]/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:ml-64 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex size-10 items-center justify-center rounded-sm text-stone-700 transition-colors hover:bg-stone-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu aria-hidden="true" size={20} />
          </button>
          <Link
            href="/"
            className="hidden text-sm font-medium text-stone-600 hover:text-stone-950 sm:block"
          >
            View Public Site
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-sm text-stone-600 transition-colors hover:bg-stone-100"
            aria-label="Notifications"
          >
            <Bell aria-hidden="true" size={20} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex size-10 items-center justify-center rounded-sm text-stone-600 transition-colors hover:bg-stone-100"
            aria-label="Logout"
          >
            <LogOut aria-hidden="true" size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
