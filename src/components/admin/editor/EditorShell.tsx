/**
 * AWIE V2 - Phase 17.2: Editor Shell - Four-Zone Container.
 *
 * ADR-011D, Section A: The Editor Shell is a FIXED four-zone layout:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Top Bar (global actions: Publish, Preview, Undo/Redo)       │
 *   ├──────────────┬───────────────────────────────┬───────────────┤
 *   │ Left Sidebar │  Main Canvas                 │ Right Sidebar │
 *   │ (Component   │  (Responsive Preview +       │ (Property      │
 *   │  Tree)       │   Selection Model)           │  Inspector)    │
 *   └──────────────┴───────────────────────────────┴───────────────┘
 *
 * THE SHELL IS A DUMB CLIENT (ADR-011A / ADR-011D):
 *
 *   - It NEVER holds, mutates, or decides the ThemeConfig.
 *   - It renders the RenderNode preview the server returns.
 *   - It PREPARES EditorCommandPayloads and hands them to the orchestrator.
 *
 * PHASE 17.2 - SELECTION MODEL (AMENDMENT G):
 *
 *   The shell holds ONLY the selected Semantic Component Identity
 *   (`selectedComponentId`, pure UI state). It derives the fully-resolved
 *   selection via the Selection Model (ADR-011D, Section B.5):
 *
 *     SelectionModel.resolve(renderNode, selectedComponentId) -> SelectionSnapshot
 *
 *   The SelectionSnapshot carries the Semantic Component Identity breadcrumb
 *   path (Page > Hero > CTA > Button), the resolved RenderNode, and the section
 *   id. Both the tree and the canvas call the SAME `handleSelect(semanticId)`
 *   entry point — this is the bidirectional selection contract.
 *
 *   AMENDMENT G: Selection is resolved ONLY by Semantic Component Identity.
 *   The shell NEVER selects by nodeId, RenderNode id, DOM id, tree index, or
 *   runtime UUID. `renderNodeId` exists ONLY for debugging.
 *
 * PHASE 17.3 - PROPERTY INSPECTOR (AMENDMENT H):
 *
 *   The Right Sidebar (Property Inspector) consumes ONLY the PropertyAdapter
 *   output — never the PropertySchema directly. The shell passes the resolved
 *   selection, the commandEmitter, and the projectId to the inspector. The
 *   inspector emits Commands on change; it never mutates the ThemeConfig.
 *
 *   The shell never mutates the ThemeConfig.
 */

'use client';

import * as React from 'react';
import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react';

import type { RenderNode } from '@/lib/renderer-foundation';
import type { EditorCommandPayload } from '@/lib/editor-integration';
import { EditorTopBar } from './EditorTopBar';
import { EditorLeftSidebar } from './EditorLeftSidebar';
import { EditorCanvas } from './EditorCanvas';
import { EditorRightSidebar } from './EditorRightSidebar';
import { SelectionModel } from './selection-model';
import { useAutosaveStore } from './autosave-store';
import { useAutosave } from './use-autosave';
import {
  useSelectionEventBus,
  selectSelectedComponentId,
} from './selection-events';

import {
  COMMAND_QUEUE_STATUS_LABELS,
  type CommandQueueStatus,
  type EditorBreadcrumbCrumb,
  type EditorCommandEmitter,
  type EditorViewport,
} from './types';


interface EditorShellProps {
  /** The RenderNode preview to render. */
  readonly renderNode: RenderNode | null;
  /** The command emitter (Dumb Client - prepare only). */
  readonly commandEmitter: EditorCommandEmitter;
  /** The id of the project being edited. */
  readonly projectId: string;
  /** The id of the page being edited. */
  readonly pageId: string;
  /** Optional initial viewport. */
  readonly initialViewport?: EditorViewport;
  /** Called when the user closes the editor shell. */
  readonly onClose: () => void;
}

/**
 * The four-zone Editor Shell container.
 *
 * Assembles the Top Bar, Left Sidebar (Component Tree), Main Canvas, and Right
 * Sidebar (Property Inspector). It manages ONLY pure UI state (viewport,
 * selected Semantic Component Identity, preview mode) and derives the resolved
 * selection through the Selection Model. It never holds or mutates the
 * ThemeConfig.
 */
export function EditorShell({
  renderNode,
  commandEmitter,
  projectId,
  pageId,
  initialViewport = 'desktop',
  onClose,
}: EditorShellProps) {
  const [viewport, setViewport] = React.useState<EditorViewport>(initialViewport);
  const [previewMode, setPreviewMode] = React.useState(false);

  // PHASE 18.1 - SELECTION EVENT BUS (Section 13):
  //
  //   The shell subscribes to the Selection Event Bus (Zustand WRAP) for the
  //   selected Semantic Component Identity. It no longer owns the selection
  //   state directly. Canvas, Tree, Inspector, and TopBar all publish and
  //   subscribe through the SAME bus — no UI component manipulates another
  //   directly.
  //
  //   AMENDMENT G: The bus carries ONLY the Semantic Component Identity (pure
  //   UI state). It NEVER selects by nodeId, RenderNode id, DOM id, tree index,
  //   or runtime UUID.
  const selectedComponentId = useSelectionEventBus(selectSelectedComponentId);



  // PHASE 17.7 - AUTOSAVE (ADR-011C + CTO CORRECTION):
  //
  //   The Autosave Mutation hook drives the Bottom Status Bar DIRECTLY from the
  //   TanStack Mutation's built-in states (isPending -> 'saving', isError ->
  //   'offline', else 'saved'). There is NO custom network state machine.
  //
  //   The `commandEmitter` prop is WRAPPED so that every Command the shell
  //   prepares is ALSO enqueued into the pending-command store. The debounced
  //   flush (1000ms) then POSTs the batch to the Server-Side Orchestration API.
  const autosave = useAutosave(projectId);
  const enqueue = useAutosaveStore((state) => state.enqueue);

  // The command queue status indicator (Bottom Status Bar). It is derived
  // DIRECTLY from the Autosave Mutation's built-in states. The shell is a Dumb
  // Client: it only DISPLAYS the status; it never executes Commands itself.
  const commandQueueStatus: CommandQueueStatus = autosave.status;

  // PHASE 17.7 - WRAPPED COMMAND EMITTER:
  //
  //   Every Command the shell prepares is handed to the parent orchestrator
  //   (Dumb Client contract) AND enqueued into the Autosave pending buffer. The
  //   server performs the actual Composition; the client never mutates the
  //   ThemeConfig.
  const autosaveEmitter = React.useMemo<EditorCommandEmitter>(
    () => ({
      emit: (payload: EditorCommandPayload) => {
        // 1. Hand the Command to the parent orchestrator (Dumb Client).
        commandEmitter.emit(payload);
        // 2. Enqueue it for the debounced Autosave flush.
        enqueue(payload);
      },
    }),
    [commandEmitter, enqueue],
  );


  // PHASE 17.2 - SELECTION MODEL (AMENDMENT G):
  //
  // The shell holds ONLY the selected Semantic Component Identity (pure UI
  // state). The fully-resolved selection is DERIVED from the RenderNode preview
  // via the Selection Model. This is the single source of truth for the
  // bidirectional contract: both the tree and the canvas call
  // `handleSelect(semanticId)`, and the model produces the same resolved
  // selection regardless of the source.
  const selection = React.useMemo(
    () => SelectionModel.resolve(renderNode, selectedComponentId),
    [renderNode, selectedComponentId],
  );

  const handleTogglePreview = React.useCallback(() => {

    setPreviewMode((prev) => !prev);
  }, []);

  // The breadcrumb trail is the Selection Model's Semantic Component Identity
  // path (Page > Hero > CTA > Button). Each crumb maps to a Semantic Component
  // Identity (ADR-012) and carries its semanticId for click-to-select.
  const breadcrumb: readonly EditorBreadcrumbCrumb[] = React.useMemo(
    () => selection.breadcrumb,
    [selection.breadcrumb],
  );

  // The command queue status indicator (Bottom Status Bar). The shell is a Dumb
  // Client: it only DISPLAYS the status; it never executes Commands itself.
  //
  // PHASE 17.7: The Autosave Mutation produces ONLY 'saving' | 'saved' |
  // 'offline'. The legacy 'conflict' status is not produced by the Autosave
  // pipeline and is intentionally omitted here.
  const CommandQueueIcon =
    commandQueueStatus === 'saving'
      ? Loader2
      : commandQueueStatus === 'offline'
        ? CloudOff
        : CheckCircle2;


  return (
    <div className="flex h-full flex-col bg-[#f8f5ed]">
      {/* Zone 0: Top Bar */}
      <EditorTopBar
        projectId={projectId}
        commandEmitter={autosaveEmitter}
        previewMode={previewMode}
        onTogglePreview={handleTogglePreview}
        onClose={onClose}
        breadcrumb={breadcrumb}
      />



      {/* Zones 1-3: Left Sidebar | Main Canvas | Right Sidebar */}
      <div className="flex min-h-0 flex-1">
        <EditorLeftSidebar
          renderNode={renderNode}
          selection={selection}
          commandEmitter={autosaveEmitter}
        />



        <EditorCanvas
          renderNode={renderNode}
          viewport={viewport}
          onViewportChange={setViewport}
          selection={selection}
          commandEmitter={autosaveEmitter}
        />




        {/* PHASE 17.3 (AMENDMENT H): The inspector consumes ONLY the
            PropertyAdapter output. The shell passes the resolved selection, the
            commandEmitter, and the projectId. The inspector emits Commands on
            change; it never mutates the ThemeConfig. */}
        <EditorRightSidebar
          selection={selection}
          commandEmitter={autosaveEmitter}
          projectId={projectId}
        />

      </div>

      {/* Bottom Status Bar: viewport, zoom, command queue indicator */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-stone-200 bg-[#fffdf8] px-4 text-[11px] text-stone-400">
        <span>
          Phase 17.3 · Editor Shell · Dumb Client — ThemeConfig은 서버에만 존재합니다
        </span>

        <div className="flex items-center gap-4">
          {/* Command queue status indicator */}
          <span
            className={`inline-flex items-center gap-1 ${
              commandQueueStatus === 'offline'
                ? 'text-amber-600'
                : commandQueueStatus === 'saving'
                  ? 'text-stone-500'
                  : 'text-emerald-600'
            }`}
          >

            <CommandQueueIcon
              aria-hidden="true"
              size={12}
              className={commandQueueStatus === 'saving' ? 'animate-spin' : undefined}
            />
            {COMMAND_QUEUE_STATUS_LABELS[commandQueueStatus]}
          </span>

          {/* Viewport indicator */}
          <span className="font-mono">{viewport}</span>

          {/* Page identity */}
          <span className="font-mono">page: {pageId.slice(0, 8)}</span>
        </div>
      </footer>
    </div>
  );
}
