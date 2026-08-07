/**
 * AWIE V2 - Phase 17.1: Editor Shell - Top Bar zone.
 *
 * ADR-011D, Section A.1: The Top Bar holds global actions (Publish, Preview,
 * Undo/Redo, Settings). It is a Dumb Client: it renders actions and PREPARES
 * Commands; it never holds or mutates the ThemeConfig.
 *
 * Phase 17.9 (History): The Undo/Redo buttons are now ACTIVE. They are wired to
 * the History API via the useHistoryShortcuts hook (THIN WRAP over
 * react-hotkeys-hook + TanStack Query). The canUndo/canRedo flags are DERIVED
 * from the mutation responses (ADR-016 State Rule) — no persistent client state
 * is introduced.
 */

'use client';

import * as React from 'react';
import { ChevronRight, Eye, Monitor, Rocket, Settings2, Undo2, Redo2 } from 'lucide-react';
import type { EditorBreadcrumbCrumb, EditorCommandEmitter } from './types';
import type { EditorHistoryResponse } from '@/lib/editor-integration';
import { useHistoryShortcuts } from '@/lib/editor-client/hooks/useHistoryShortcuts';
import { useSelectionEventBus } from './selection-events';

interface EditorTopBarProps {
  /** The id of the project being edited. */
  readonly projectId: string;
  /** The command emitter (Dumb Client - prepare only). */
  readonly commandEmitter: EditorCommandEmitter;
  /** Whether the shell is in preview mode. */
  readonly previewMode: boolean;
  /** Toggles preview mode. */
  readonly onTogglePreview: () => void;
  /** Closes the editor shell. */
  readonly onClose: () => void;
  /** The selection breadcrumb trail (e.g. Page > Hero > CTA > Button). */
  readonly breadcrumb: readonly EditorBreadcrumbCrumb[];
  /** Called with the server's History result after an Undo/Redo (updates the canvas preview). */
  readonly onHistoryResult?: (result: EditorHistoryResponse) => void;
}


/**
 * The Top Bar zone of the Editor Shell.
 *
 * Renders the global action surface: Preview toggle, Undo/Redo, Publish, and
 * Settings. It is a pure Dumb Client — it never holds or mutates the
 * ThemeConfig. Undo/Redo are SYSTEM CONTROL operations sent to the History API;
 * the server returns the NEW RenderNode preview.
 */
export function EditorTopBar({
  projectId,
  commandEmitter,
  previewMode,
  onTogglePreview,
  onClose,
  breadcrumb,
  onHistoryResult,
}: EditorTopBarProps) {

  // Phase 17.9: History is ACTIVE. The Undo/Redo buttons and the mod+z /
  // mod+shift+z shortcuts are wired to the History API via the
  // useHistoryShortcuts hook (THIN WRAP over react-hotkeys-hook + TanStack
  // Query). The hook DERIVES canUndo/canRedo from the mutation responses
  // (ADR-016 State Rule) — no persistent client state is introduced.
  const { undo, redo, canUndo, canRedo, isUndoing, isRedoing } = useHistoryShortcuts(
    projectId,
    onHistoryResult,
  );

  // PHASE 18.1 - SELECTION EVENT BUS (Section 13):
  //
  //   The Top Bar PUBLISHES a SelectionChanged event on the Selection Event Bus
  //   when a breadcrumb crumb is clicked. It no longer calls a prop-drilled
  //   callback. The bus is the single source of truth — Canvas, Tree,
  //   Inspector, and TopBar all subscribe to the SAME bus. No UI component
  //   manipulates another directly.
  //
  //   AMENDMENT G: The event carries ONLY the Semantic Component Identity.
  const select = useSelectionEventBus((state) => state.select);


  const handleUndo = () => {
    void commandEmitter;
    undo();
  };

  const handleRedo = () => {
    void commandEmitter;
    redo();
  };

  return (
    <div className="shrink-0 border-b border-stone-200 bg-[#fffdf8]">
      <header className="flex h-14 items-center justify-between px-4">
      {/* Left: brand + project identity */}
      <div className="flex items-center gap-3">
        <span className="font-serif text-base font-semibold text-stone-950">
          AWIE Editor
        </span>
        <span className="hidden text-xs text-stone-400 sm:inline">
          Project {projectId.slice(0, 8)}
        </span>
      </div>

      {/* Center: global actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePreview}
          className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
            previewMode
              ? 'bg-amber-900 text-[#fffdf8]'
              : 'border border-stone-300 bg-white text-stone-700 hover:border-stone-950'
          }`}
          aria-pressed={previewMode}
        >
          <Eye aria-hidden="true" size={16} />
          {previewMode ? '편집 모드' : '미리보기'}
        </button>

        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo || isUndoing}
          title="실행 취소 (Ctrl/Cmd+Z)"
          className="inline-flex items-center gap-1.5 rounded-sm border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          <Undo2 aria-hidden="true" size={16} />
          <span className="hidden sm:inline">실행 취소</span>
        </button>

        <button
          type="button"
          onClick={handleRedo}
          disabled={!canRedo || isRedoing}
          title="다시 실행 (Ctrl/Cmd+Shift+Z)"
          className="inline-flex items-center gap-1.5 rounded-sm border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
        >
          <Redo2 aria-hidden="true" size={16} />
          <span className="hidden sm:inline">다시 실행</span>
        </button>
      </div>

      {/* Right: publish + settings + close */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-sm bg-amber-900 px-4 py-1.5 text-sm font-semibold text-[#fffdf8] transition-colors hover:bg-amber-800"
        >
          <Rocket aria-hidden="true" size={16} />
          발행
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-950"
        >
          <Settings2 aria-hidden="true" size={16} />
          <span className="hidden sm:inline">설정</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-950"
        >
          <Monitor aria-hidden="true" size={16} />
          <span className="hidden sm:inline">닫기</span>
        </button>
      </div>
      </header>

      {/* Breadcrumb trail: selection depth context (e.g. Page > Hero > CTA > Button).
          Each crumb maps to a Semantic Component Identity (ADR-012). It is a pure
          Dumb Client view — it renders the selection path the server reports. */}
      <nav
        aria-label="선택 경로"
        className="flex items-center gap-1 overflow-x-auto border-t border-stone-100 px-4 py-1.5 text-xs text-stone-500"
      >
        {breadcrumb.length === 0 ? (
          <span className="text-stone-400">선택된 요소 없음</span>
        ) : (
          breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <React.Fragment key={crumb.semanticId}>
                {index > 0 && (
                  <ChevronRight aria-hidden="true" size={12} className="shrink-0 text-stone-300" />
                )}
                <button
                  type="button"
                  onClick={() => select(crumb.semanticId)}
                  className={`shrink-0 whitespace-nowrap transition-colors ${

                    isLast
                      ? 'font-medium text-amber-900'
                      : 'text-stone-500 hover:text-amber-900'
                  }`}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            );
          })
        )}
      </nav>
    </div>
  );
}
