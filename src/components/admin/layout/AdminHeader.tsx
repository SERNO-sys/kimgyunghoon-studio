'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Loader2, LogOut, Menu, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface AdminHeaderProps {
  onMenuToggle: () => void;
  siteUrl?: string;
  siteId?: string;
}

export function AdminHeader({ onMenuToggle, siteUrl, siteId }: AdminHeaderProps) {
  const router = useRouter();
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);


  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
      if (response.ok && result.success) {
        toast.addToast(
          '1초 만에 홈페이지가 실시간 갱신 배포되었습니다!',
          'success'
        );
      } else {
        toast.addToast(result.message || '배포에 실패했습니다.', 'error');
      }
    } catch {
      toast.addToast('배포 중 오류가 발생했습니다.', 'error');
    } finally {
      setPublishing(false);
    }
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
          {siteUrl ? (
            <Link
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-sm font-medium text-stone-600 hover:text-stone-950 sm:block"
            >
              View Public Site
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 rounded-sm bg-amber-900 px-2.5 py-2 text-sm font-semibold text-[#fffdf8] transition-colors hover:bg-amber-800 disabled:opacity-60 sm:px-3"
            aria-label="Publish site"
          >
            {publishing ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Rocket aria-hidden="true" size={16} />
            )}
            <span className="hidden sm:inline">
              {publishing ? '배포 중...' : 'Publish / Update Site'}
            </span>
            <span className="sm:hidden">
              {publishing ? '배포 중...' : 'Publish'}
            </span>
          </button>

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
