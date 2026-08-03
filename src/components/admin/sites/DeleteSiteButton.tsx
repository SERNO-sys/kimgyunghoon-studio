'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface DeleteSiteButtonProps {
  siteId: string;
  siteName?: string;
  /** Renders a compact icon-only button (used inside the advanced edit drawer). */
  compact?: boolean;
  /** Called after a successful delete (before redirect). */
  onDeleted?: () => void;
}

/**
 * Destructive "delete site" action. Confirms with the user, calls the delete
 * API (which removes the site and all related records), then redirects to the
 * admin dashboard so the user can start fresh.
 */
export function DeleteSiteButton({
  siteId,
  siteName,
  compact = false,
  onDeleted,
}: DeleteSiteButtonProps) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `정말로 "${siteName || '이 사이트'}"를 삭제할까요?\n\n삭제하면 사이트와 모든 콘텐츠(게시글, 미디어, 도메인, 설정)가 영구적으로 지워집니다. 이 작업은 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'DELETE',
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        toast.addToast(result.message || '사이트가 삭제되었습니다.', 'success');
        onDeleted?.();
        router.push('/admin');
        router.refresh();
      } else {
        toast.addToast(result.message || '사이트 삭제에 실패했습니다.', 'error');
      }
    } catch {
      toast.addToast('사이트 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-60"
      >
        {deleting ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <Trash2 aria-hidden="true" size={16} />
        )}
        {deleting ? '삭제 중...' : '🗑️ 사이트 삭제'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-60"
    >
      {deleting ? (
        <Loader2 aria-hidden="true" className="animate-spin" size={16} />
      ) : (
        <Trash2 aria-hidden="true" size={16} />
      )}
      {deleting ? '삭제 중...' : '🗑️ 사이트 삭제'}
    </button>
  );
}
