'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  History,
  Loader2,
  RotateCcw,
  TriangleAlert,
  User,
  CalendarDays,
  Layers,
  Hash,
} from 'lucide-react';


import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';

/**
 * AWIE V2 - Phase I.2: Admin UI Wiring (Version History & Rollback).
 *
 * A Dumb Client panel that surfaces the server-side Version Management
 * capabilities (built in Milestone H) inside the Admin Dashboard.
 *
 * ARCHITECTURAL MANDATES (Dumb Client):
 *
 *   1. THE CLIENT IS A DUMB CLIENT
 *      This component NEVER receives or holds the ThemeConfig. It renders ONLY
 *      the snapshot METADATA returned by the server (VersionHistoryEntry) and
 *      emits HTTP requests. It NEVER composes, mutates, or evaluates the
 *      ThemeConfig.
 *
 *   2. THE SERVER IS THE SOLE ORCHESTRATOR
 *      This component NEVER imports the VersionHistoryService, the
 *      ProjectRepository, or any Runtime service. It talks ONLY to the existing
 *      server routes:
 *        - GET  /api/cms/projects/[id]/versions
 *        - POST /api/cms/projects/[id]/versions/[snapshotId]/rollback
 *
 *   3. SERVER-CONFIRMED DATA ONLY
 *      After a rollback, this component re-fetches the Version History from the
 *      server and reflects the server-confirmed Live snapshot. It never
 *      optimistically mutates local state to claim a rollback succeeded.
 *
 *   4. NO NEW INFRASTRUCTURE (Buy Before Build)
 *      This panel adds NO new persistence, NO new backend session store, and NO
 *      new business logic. It is a THIN WRAPPER over the existing server routes.
 */

interface VersionHistoryEntry {
  readonly snapshotId: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly publishedBy: string;
  readonly publishedAt: string;
  readonly isLive: boolean;
}

interface VersionHistoryResult {
  readonly success: true;
  readonly projectId: string;
  readonly versions: readonly VersionHistoryEntry[];
  readonly liveSnapshotId?: string;
  readonly hasDraft: boolean;
}

interface VersionHistoryError {
  readonly success: false;
  readonly error: string;
}

type VersionHistoryResponse = VersionHistoryResult | VersionHistoryError;

interface VersionRollbackResult {
  readonly success: true;
  readonly projectId: string;
  readonly liveSnapshotId: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly publishedAt: string;
  readonly publishedBy: string;
}

interface VersionRollbackError {
  readonly success: false;
  readonly error: string;
}

type VersionRollbackResponse = VersionRollbackResult | VersionRollbackError;

/**
 * Phase I.4 — Snapshot Detail.
 *
 * The metadata payload returned by the existing server route
 * `GET /api/cms/projects/[id]/versions/[snapshotId]`. The client receives ONLY
 * snapshot METADATA (Version, Published By, Published At, Schema) — NEVER the
 * ThemeConfig. The `preview` RenderNode is intentionally not consumed here;
 * this panel is a metadata detail view, not a compare/preview surface.
 */
interface VersionDetailEntry {
  readonly snapshotId: string;
  readonly version: string;
  readonly schemaVersion: string;
  readonly publishedBy: string;
  readonly publishedAt: string;
  readonly isLive: boolean;
}

interface VersionDetailResult {
  readonly success: true;
  readonly projectId: string;
  readonly version: VersionDetailEntry;
  readonly pageId: string;
}

interface VersionDetailError {
  readonly success: false;
  readonly error: string;
}

type VersionDetailResponse = VersionDetailResult | VersionDetailError;

interface VersionHistoryPanelProps {
  /** The id of the project (site) whose Version History is shown. */
  projectId: string;
}


/** Formats an ISO timestamp into a short, human-readable local string. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The Version History & Rollback panel.
 *
 * Dumb Client — it fetches the Version History metadata from the server, renders
 * it, and emits a single POST intent to roll back to a specific snapshot. It
 * NEVER holds or mutates the ThemeConfig.
 */
export function VersionHistoryPanel({ projectId }: VersionHistoryPanelProps) {
  const toast = useToast();

  const [versions, setVersions] = useState<readonly VersionHistoryEntry[]>([]);
  const [liveSnapshotId, setLiveSnapshotId] = useState<string | undefined>();
  const [hasDraft, setHasDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  // Phase I.4: Snapshot Detail state. `selectedSnapshotId` is the snapshot whose
  // metadata detail view is currently open (or null when the list is shown).
  // `detail` holds the server-confirmed metadata for that snapshot.
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null,
  );
  const [detail, setDetail] = useState<VersionDetailEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Phase I.2: Fetch the Version History metadata from the server. The client
  // receives ONLY snapshot metadata — never the ThemeConfig.

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/cms/projects/${projectId}/versions`);
      const result = (await response.json()) as VersionHistoryResponse;
      if (response.ok && result.success) {
        setVersions(result.versions);
        setLiveSnapshotId(result.liveSnapshotId);
        setHasDraft(result.hasDraft);
      } else {
        setLoadError(
          (result as VersionHistoryError).error || '버전 기록을 불러오지 못했습니다.',
        );
      }
    } catch {
      setLoadError('버전 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  // Phase I.2: Roll back to a specific snapshot. Dumb Client — this emits a
  // single POST intent to the server route. On success it re-fetches the
  // Version History so the UI reflects the server-confirmed Live snapshot.
  const handleRollback = async (snapshotId: string) => {
    if (rollingBackId) return;
    setRollingBackId(snapshotId);
    try {
      const response = await fetch(
        `/api/cms/projects/${projectId}/versions/${snapshotId}/rollback`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      );
      const result = (await response.json()) as VersionRollbackResponse;
      if (response.ok && result.success) {
        toast.addToast(
          `v${result.version} 버전으로 되돌렸습니다.`,
          'success',
        );
        // Re-fetch the server-confirmed Version History so the Live badge and
        // rollback availability reflect the new Release Pointer.
        await loadVersions();
      } else {
        toast.addToast(
          (result as VersionRollbackError).error || '되돌리기에 실패했습니다.',
          'error',
        );
      }
    } catch {
      toast.addToast('되돌리기 중 오류가 발생했습니다.', 'error');
    } finally {
      setRollingBackId(null);
    }
  };

  // Phase I.4: Open the Snapshot Detail view for a specific snapshot. Dumb
  // Client — this emits a single GET intent to the existing server route and
  // renders ONLY the returned snapshot METADATA. It NEVER receives or holds the
  // ThemeConfig.
  const handleViewDetail = async (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const response = await fetch(
        `/api/cms/projects/${projectId}/versions/${snapshotId}`,
      );
      const result = (await response.json()) as VersionDetailResponse;
      if (response.ok && result.success) {
        setDetail(result.version);
      } else {
        setDetailError(
          (result as VersionDetailError).error || '버전 정보를 불러오지 못했습니다.',
        );
      }
    } catch {
      setDetailError('버전 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Phase I.4: Close the Snapshot Detail view and return to the list.
  const handleCloseDetail = () => {
    setSelectedSnapshotId(null);
    setDetail(null);
    setDetailError(null);
  };

  return (
    <Card>
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <History aria-hidden="true" size={18} className="text-stone-500" />
          <h2 className="font-serif text-lg font-semibold text-stone-950">
            버전 기록
          </h2>
        </div>
        <p className="mt-0.5 text-sm text-stone-600">
          발행된 버전을 확인하고, 원하는 시점으로 되돌릴 수 있습니다.
        </p>
      </div>


      {hasDraft ? (
        <div className="mb-3 flex items-center gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <TriangleAlert aria-hidden="true" size={16} />
          저장되지 않은 초안이 있습니다. 발행하면 새 버전으로 기록됩니다.
        </div>
      ) : null}

      {selectedSnapshotId ? (
        <div className="rounded-sm border border-stone-200">
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-3 py-2">
            <button
              type="button"
              onClick={handleCloseDetail}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950"
            >
              <ChevronLeft aria-hidden="true" size={16} />
              버전 목록으로
            </button>
            <span className="font-mono text-sm font-semibold text-stone-900">
              v{detail?.version ?? '...'}
            </span>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-stone-500">
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              버전 정보를 불러오는 중...
            </div>
          ) : detailError ? (
            <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {detailError}
            </div>
          ) : detail ? (
            <dl className="divide-y divide-stone-100">
              <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-sm text-stone-500">
                  <Hash aria-hidden="true" size={14} />
                  버전
                </dt>
                <dd className="font-mono text-sm font-semibold text-stone-900">
                  v{detail.version}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-sm text-stone-500">
                  <User aria-hidden="true" size={14} />
                  발행자
                </dt>
                <dd className="text-sm text-stone-900">{detail.publishedBy}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-sm text-stone-500">
                  <CalendarDays aria-hidden="true" size={14} />
                  발행 시각
                </dt>
                <dd className="text-sm text-stone-900">
                  {formatDate(detail.publishedAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                <dt className="flex items-center gap-2 text-sm text-stone-500">
                  <Layers aria-hidden="true" size={14} />
                  스키마
                </dt>
                <dd className="font-mono text-sm text-stone-900">
                  {detail.schemaVersion}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 px-3 py-2.5">
                <dt className="text-sm text-stone-500">상태</dt>
                <dd>
                  {detail.isLive ? (
                    <Badge className="bg-emerald-50 text-emerald-700">
                      <CheckCircle2 aria-hidden="true" size={12} />
                      운영 중
                    </Badge>
                  ) : (
                    <Badge className="bg-stone-100 text-stone-600">
                      이전 버전
                    </Badge>
                  )}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : loading ? (

        <div className="flex items-center justify-center gap-2 py-8 text-sm text-stone-500">
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          버전 기록을 불러오는 중...
        </div>
      ) : loadError ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      ) : versions.length === 0 ? (
        <div className="rounded-sm border border-stone-200 bg-stone-50 px-3 py-6 text-center text-sm text-stone-500">
          아직 발행된 버전이 없습니다. 첫 발행을 하면 여기에 기록됩니다.
        </div>
      ) : (
        <ul className="divide-y divide-stone-200">
          {versions.map((entry) => {
            const isLive = entry.snapshotId === liveSnapshotId;
            const isRollingBack = rollingBackId === entry.snapshotId;
            return (
              <li
                key={entry.snapshotId}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-stone-900">
                      v{entry.version}
                    </span>
                    {isLive ? (
                      <Badge className="bg-emerald-50 text-emerald-700">
                        <CheckCircle2 aria-hidden="true" size={12} />
                        운영 중
                      </Badge>
                    ) : (
                      <Badge className="bg-stone-100 text-stone-600">
                        이전 버전
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDate(entry.publishedAt)} · {entry.publishedBy} ·{' '}
                    {entry.schemaVersion}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewDetail(entry.snapshotId)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-500 hover:bg-stone-100"
                  >
                    상세 보기
                  </button>
                  {!isLive ? (
                    <button
                      type="button"
                      onClick={() => handleRollback(entry.snapshotId)}
                      disabled={rollingBackId !== null}
                      className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-amber-900 hover:bg-amber-900 hover:text-stone-50 disabled:opacity-60"
                    >
                      {isRollingBack ? (
                        <Loader2
                          aria-hidden="true"
                          className="animate-spin"
                          size={14}
                        />
                      ) : (
                        <RotateCcw aria-hidden="true" size={14} />
                      )}
                      {isRollingBack ? '되돌리는 중...' : '이 버전으로 되돌리기'}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}


