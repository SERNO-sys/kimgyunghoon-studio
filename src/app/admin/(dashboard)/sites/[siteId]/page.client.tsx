'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Rocket,
  Settings2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { AdvancedEditorDrawer } from '@/components/admin/sites/AdvancedEditorDrawer';

interface SitePreviewPageProps {
  siteId: string;
  siteName: string;
  siteDescription: string;
  isPublished: boolean;
  deployVersion: string;
  publicUrl: string;
  previewUrl: string;
  primaryDomain: string | null;
}

/**
 * V2 Theme System - Phase 4.
 * Preview-centric site view. The main surface is a live preview of the site
 * plus a single, prominent "Publish" action. All complex configuration
 * (presets, themes, navigation, settings, etc.) is hidden behind the
 * "Advanced Edit" drawer so first-time users only see result + publish.
 */
export function SitePreviewPage({
  siteId,
  siteName,
  siteDescription,
  isPublished,
  deployVersion,
  publicUrl,
  previewUrl,
  primaryDomain,
}: SitePreviewPageProps) {
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        toast.addToast(
          result.message || '1초 만에 홈페이지가 실시간 갱신 배포되었습니다!',
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
    <div className="space-y-6">
      {/* Header: site name + publish status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl font-semibold text-stone-950">
              {siteName}
            </h1>
            {isPublished ? (
              <Badge className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700">
                <CheckCircle2 aria-hidden="true" size={14} />
                Published
              </Badge>
            ) : (
              <Badge className="inline-flex items-center gap-1 bg-amber-50 text-amber-800">
                Draft
              </Badge>
            )}
          </div>
          <p className="mt-2 text-stone-600">{siteDescription}</p>
          {primaryDomain ? (
            <p className="mt-1 text-sm text-stone-500">
              {primaryDomain}
              {deployVersion ? ` · v${deployVersion}` : ''}
            </p>
          ) : null}
        </div>
        <Link
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950"
        >
          <ExternalLink aria-hidden="true" size={16} />
          View Public Site
        </Link>
      </div>

      {/* Primary action bar: Publish is the largest, most prominent element */}
      <Card className="flex flex-col gap-4 border-amber-900/20 bg-gradient-to-r from-amber-50 to-[#fffdf8] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-stone-950">
            {isPublished ? '홈페이지가 실시간으로 운영 중입니다' : '홈페이지를 지금 바로 공개하세요'}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {isPublished
              ? '변경 사항이 있으면 아래 버튼으로 1초 만에 다시 배포할 수 있습니다.'
              : '발행 버튼을 누르면 1초 만에 홈페이지가 실시간으로 배포됩니다.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-sm bg-amber-900 px-8 py-3 text-lg font-bold text-[#fffdf8] shadow-lg shadow-amber-900/20 transition-all hover:bg-amber-800 hover:shadow-xl disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={22} />
            ) : (
              <Rocket aria-hidden="true" size={22} />
            )}
            {publishing ? '배포 중...' : '🚀 바로 발행하기'}
          </button>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-6 py-3 text-base font-semibold text-stone-800 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50"
          >
            <Settings2 aria-hidden="true" size={20} />
            ⚙️ 고급 편집
          </button>
        </div>
      </Card>

      {/* Live preview */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2.5">
          <p className="text-sm font-medium text-stone-600">미리보기 (Preview)</p>
          <span className="text-xs text-stone-400">최신 초안 상태를 반영합니다</span>
        </div>
        <iframe
          src={previewUrl}
          title={`${siteName} 미리보기`}
          className="h-[70vh] w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </Card>

      <AdvancedEditorDrawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        siteId={siteId}
      />
    </div>
  );
}
