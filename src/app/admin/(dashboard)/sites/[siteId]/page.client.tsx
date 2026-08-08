'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Rocket,
  Settings2,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { AdvancedEditorDrawer } from '@/components/admin/sites/AdvancedEditorDrawer';
import { AIVibeChange } from '@/components/admin/sites/AIVibeChange';
import { DeleteSiteButton } from '@/components/admin/sites/DeleteSiteButton';
import { VersionHistoryPanel } from '@/components/admin/sites/VersionHistoryPanel';

import { EditorShell } from '@/components/admin/editor';
import type { EditorCommandPayload } from '@/lib/editor-integration';
import type { AiDesignReport } from '@/types/site';

interface SitePreviewPageProps {
  siteId: string;
  siteName: string;
  siteDescription: string;
  isPublished: boolean;
  deployVersion: string;
  publicUrl: string;
  previewUrl: string;
  primaryDomain: string | null;
  /** AWIE Decision Engine: the AI's design rationale shown to build trust. */
  aiDesignReport?: AiDesignReport | null;
  /** Phase 20.6: Project-scoped content stats (read-only snapshot). */
  postCount: number;
  mediaCount: number;
  domainCount: number;
  deployVersionCount: number;
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
  aiDesignReport,
  postCount,
  mediaCount,
  domainCount,
  deployVersionCount,
}: SitePreviewPageProps) {

  const toast = useToast();
  const [publishing, setPublishing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  // Phase 17.1: the four-zone Editor Shell (Dumb Client). Opens as a full-screen
  // overlay. For Shell-only, the command emitter is a no-op placeholder; the
  // server wiring (which sends EditorCommandPayloads) is a later Phase 17 step.
  const [shellOpen, setShellOpen] = useState(false);
  // Bumped after an AI redesign so the preview iframe reloads with the new theme.
  const [previewKey, setPreviewKey] = useState(0);

  // Phase 20.4: Project Settings. Local editable copies of the project's
  // metadata. The client is a Dumb Client — it only emits the PATCH to the
  // server route and reflects the server-confirmed values back into local
  // state. It never mutates ThemeConfig or any protected field.
  const [projectName, setProjectName] = useState(siteName);
  const [projectDescription, setProjectDescription] = useState(siteDescription);
  const [savingSettings, setSavingSettings] = useState(false);

  // Phase 20.5: Duplicate Project. Dumb Client — only POSTs the source siteId
  // to the server route and redirects to the new project. It never composes or
  // mutates ThemeConfig; the server copies the immutable SSOT verbatim.
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Phase 17.1: Dumb Client command emitter (prepare only). The shell hands
  // Commands here; the orchestrator sends them to the server. For Shell-only,
  // this is a no-op placeholder until the Command wiring step.
  const commandEmitter = {
    emit: (payload: EditorCommandPayload) => {
      // Phase 17.1: no-op. The Command wiring step will POST this payload to
      // the Server-Side Orchestration API.
      void payload;
    },
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

  // Phase 20.4: Project Settings. Dumb Client — emits the PATCH to the server
  // route and reflects the server-confirmed values back into local state. The
  // client never mutates ThemeConfig or any protected field.
  const handleSaveSettings = async () => {
    if (savingSettings) return;
    if (!projectName.trim()) {
      toast.addToast('사이트 이름을 입력해주세요.', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        site?: { name: string; description: string };
      };
      if (response.ok && result.success && result.site) {
        // Reflect the server-confirmed values back into local state so the
        // header and settings form stay in sync without a full reload.
        setProjectName(result.site.name);
        setProjectDescription(result.site.description);
        toast.addToast(result.message || '프로젝트 정보가 저장되었습니다.', 'success');
      } else {
        toast.addToast(result.message || '저장에 실패했습니다.', 'error');
      }
    } catch {
      toast.addToast('저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Phase 20.5: Duplicate Project. Dumb Client — POSTs the source siteId to the
  // server route and redirects to the new project on success. The server copies
  // the immutable ThemeConfig verbatim; the client never composes or mutates it.
  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);
    setDuplicateError(null);
    try {
      const response = await fetch(`/api/admin/sites/${siteId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        siteId?: string;
      };
      if (response.ok && result.success && result.siteId) {
        toast.addToast(result.message || '프로젝트가 복제되었습니다.', 'success');
        // Navigate to the newly created project so the user can rename it and
        // continue working immediately.
        window.location.href = `/admin/sites/${result.siteId}`;
      } else {
        setDuplicateError(result.message || '복제에 실패했습니다.');
        toast.addToast(result.message || '복제에 실패했습니다.', 'error');
      }
    } catch {
      setDuplicateError('복제 중 오류가 발생했습니다.');
      toast.addToast('복제 중 오류가 발생했습니다.', 'error');
    } finally {
      setDuplicating(false);
    }
  };

  return (

    <div className="space-y-6">
      {/* Phase 20.3: Back navigation to the multi-project dashboard. In a
          multi-project world the user needs a clear way to return to the
          project list from any project's management surface. */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-950"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        내 사이트
      </Link>

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
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950"
          >
            <ExternalLink aria-hidden="true" size={16} />
            View Public Site
          </Link>
          {/* Phase 20.5: Duplicate Project. Dumb Client — POSTs the source
              siteId to the server route and redirects to the new project. The
              server copies the immutable ThemeConfig verbatim; the client never
              composes or mutates it. */}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-950 hover:text-stone-950 disabled:opacity-60"
          >
            {duplicating ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Copy aria-hidden="true" size={16} />
            )}
            {duplicating ? '복제 중...' : '복제'}
          </button>
          {duplicateError ? (
            <p className="text-xs text-red-600">{duplicateError}</p>
          ) : null}
          {/* Phase 20.3: destructive project action surfaced on the hub page.
              Delegates to the existing DeleteSiteButton (Dumb Client) which
              confirms, calls the delete API, and redirects to the dashboard. */}
          <DeleteSiteButton siteId={siteId} siteName={siteName} compact />
        </div>
      </div>

      {/* Phase 20.6: Project Overview. A read-only server-rendered snapshot of
          what lives inside THIS project. The client is a Dumb Client — it only
          renders the counts and links to the existing management surfaces. No
          business logic, no ThemeConfig mutation. */}
      <Card>
        <div className="mb-3">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            프로젝트 현황
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">
            이 사이트에 담긴 콘텐츠와 배포 현황을 한눈에 확인하세요.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/posts"
            className="group rounded-sm border border-stone-200 bg-stone-50 p-4 transition-colors hover:border-stone-950 hover:bg-stone-950"
          >
            <div className="flex items-center gap-2 text-stone-500 transition-colors group-hover:text-stone-300">
              <FileText aria-hidden="true" size={16} />
              <span className="text-sm font-medium">게시글</span>
            </div>
            <p className="mt-2 font-serif text-3xl font-semibold text-stone-950 transition-colors group-hover:text-stone-50">
              {postCount}
            </p>
          </Link>
          <Link
            href="/admin/media"
            className="group rounded-sm border border-stone-200 bg-stone-50 p-4 transition-colors hover:border-stone-950 hover:bg-stone-950"
          >
            <div className="flex items-center gap-2 text-stone-500 transition-colors group-hover:text-stone-300">
              <ImageIcon aria-hidden="true" size={16} />
              <span className="text-sm font-medium">미디어</span>
            </div>
            <p className="mt-2 font-serif text-3xl font-semibold text-stone-950 transition-colors group-hover:text-stone-50">
              {mediaCount}
            </p>
          </Link>
          <Link
            href="/admin/domain"
            className="group rounded-sm border border-stone-200 bg-stone-50 p-4 transition-colors hover:border-stone-950 hover:bg-stone-950"
          >
            <div className="flex items-center gap-2 text-stone-500 transition-colors group-hover:text-stone-300">
              <Globe aria-hidden="true" size={16} />
              <span className="text-sm font-medium">도메인</span>
            </div>
            <p className="mt-2 font-serif text-3xl font-semibold text-stone-950 transition-colors group-hover:text-stone-50">
              {domainCount}
            </p>
          </Link>
          <Link
            href="/admin/deployment"
            className="group rounded-sm border border-stone-200 bg-stone-50 p-4 transition-colors hover:border-stone-950 hover:bg-stone-950"
          >
            <div className="flex items-center gap-2 text-stone-500 transition-colors group-hover:text-stone-300">
              <Rocket aria-hidden="true" size={16} />
              <span className="text-sm font-medium">배포 버전</span>
            </div>
            <p className="mt-2 font-serif text-3xl font-semibold text-stone-950 transition-colors group-hover:text-stone-50">
              {deployVersionCount}
            </p>
          </Link>
        </div>
      </Card>

      {/* Phase 20.3: Project management hub. Turns the preview-centric page
          into a project hub by surfacing the project's content/infra surfaces
          as first-class quick links. These are plain navigation links to
          existing routes — no business logic, no ThemeConfig mutation. */}
      <Card>
        <div className="mb-3">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            프로젝트 관리
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">
            이 사이트의 콘텐츠와 인프라를 관리하세요.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/posts"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50"
          >
            <FileText aria-hidden="true" size={16} />
            게시글
          </Link>
          <Link
            href="/admin/media"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50"
          >
            <ImageIcon aria-hidden="true" size={16} />
            미디어
          </Link>
          <Link
            href="/admin/domain"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50"
          >
            <Globe aria-hidden="true" size={16} />
            도메인
          </Link>
          <Link
            href="/admin/deployment"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50"
          >
            <Rocket aria-hidden="true" size={16} />
            배포
          </Link>
        </div>
      </Card>

      {/* Phase I.2: Version History & Rollback. A Dumb Client panel that lists
          the project's published versions (metadata only) and emits a single
          POST intent to roll back to a specific snapshot. It NEVER holds or
          mutates the ThemeConfig — it renders only server-confirmed metadata
          from the existing Version Management routes. */}
      <VersionHistoryPanel projectId={siteId} />

      {/* Phase 20.4: Project Settings. Lets the owner rename the project and
          edit its description directly on the hub. Dumb Client — the form only
          emits a PATCH to the server route and reflects the server-confirmed
          values back. It never mutates ThemeConfig or any protected field. */}
      <Card>

        <div className="mb-3">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            프로젝트 설정
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">
            사이트 이름과 설명을 수정합니다.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              사이트 이름
            </span>
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              maxLength={120}
              className="w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-amber-900 focus:ring-2 focus:ring-amber-900/20"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              설명
            </span>
            <input
              type="text"
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              maxLength={500}
              className="w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-amber-900 focus:ring-2 focus:ring-amber-900/20"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-stone-950 px-5 py-2 text-sm font-semibold text-stone-50 transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {savingSettings ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Settings2 aria-hidden="true" size={16} />
            )}
            {savingSettings ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </Card>

      {/* AWIE Decision Engine: AI design report banner.


          Explains WHY the AI designed the site this way, building trust that
          the result came from analyzing the user's business, not a guess. */}
      {aiDesignReport ? (
        <Card className="border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Sparkles aria-hidden="true" size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-base font-semibold text-stone-950">
                AI가 {aiDesignReport.analyzed_industry || '내 사업'}을 분석해 설계했어요
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-700">
                {aiDesignReport.reasoning}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

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
          <button
            type="button"
            onClick={() => setShellOpen(true)}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-sm border border-amber-900/30 bg-amber-900/5 px-6 py-3 text-base font-semibold text-amber-900 transition-colors hover:bg-amber-900 hover:text-[#fffdf8]"
          >
            <LayoutTemplate aria-hidden="true" size={20} />
            🧩 에디터
          </button>

        </div>
      </Card>

      {/* AI vibe change */}
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50">
        <div className="mb-3">
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            ✨ AI로 분위기 바꾸기
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">
            원하는 느낌을 적으면 AI가 홈페이지 전체 디자인 프리셋을 즉시 바꿔드려요.
          </p>
        </div>
        <AIVibeChange
          siteId={siteId}
          onApplied={() => setPreviewKey((key) => key + 1)}
        />
      </Card>

      {/* Live preview */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2.5">
          <p className="text-sm font-medium text-stone-600">미리보기 (Preview)</p>
          <span className="text-xs text-stone-400">최신 초안 상태를 반영합니다</span>
        </div>
        {/* Read-only preview. A transparent shield sits on top of the iframe so
            clicks can never navigate the iframe away (the "frame-in-frame"
            bug). The preview is strictly eyes-only. */}
        <div className="relative">
          <iframe
            key={previewKey}
            src={previewUrl}
            title={`${siteName} 미리보기`}
            className="h-[70vh] w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-50 bg-transparent"
          />
        </div>
      </Card>

      <AdvancedEditorDrawer
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        siteId={siteId}
      />

      {/* Phase 17.1: four-zone Editor Shell (Dumb Client) as a full-screen
          overlay. For Shell-only, renderNode is null (the shell renders its
          empty states) and the command emitter is a no-op placeholder. The
          server wiring (RenderNode preview + Command POST) is a later Phase 17
          step. */}
      {shellOpen ? (
        <div className="fixed inset-0 z-[100]">
          <EditorShell
            renderNode={null}
            commandEmitter={commandEmitter}
            projectId={siteId}
            pageId="home"
            onClose={() => setShellOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
