/**
 * AWIE V2 - Phase 17.2/17.4: Editor Shell - Left Sidebar (Component Tree +
 * Component Palette) zone.
 *
 * ADR-011D, Section A.2 (Zone 1): The Left Sidebar displays the Project's
 * section/component hierarchy as a navigable tree. Each node maps to a
 * Semantic Component Identity (ADR-012). Selecting a node selects the
 * corresponding element on the Main Canvas (bidirectional selection).
 *
 * PHASE 17.2 - SELECTION MODEL (AMENDMENT G):
 *
 *   The tree consumes the RESOLVED selection (SelectionSnapshot) produced by
 *   the Selection Model. It renders the hierarchy via
 *   `SelectionModel.flattenTree(renderNode)` and highlights the selected node.
 *   Clicking a node calls the SAME `onSelectNode(semanticId)` entry point the
 *   canvas uses — this is the bidirectional selection contract.
 *
 *   AMENDMENT G: Selection is resolved ONLY by Semantic Component Identity
 *   (`SelectionTreeEntry.semanticId`). The tree NEVER selects by nodeId,
 *   RenderNode id, DOM id, tree index, or runtime UUID.
 *
 * PHASE 17.4 - COMPONENT PALETTE (ADR-014, Amendment J):
 *
 *   The palette is the DRAG SOURCE. Each palette item is draggable (dnd-kit,
 *   WRAP) and carries a DragSourcePayload — the Semantic Component Identity of
 *   the component being dragged (Amendment G). Dragging NEVER mutates the
 *   ThemeConfig; it produces intent only. The Canvas (drop zone) builds the
 *   DropIntent and emits an InsertComponentCommand on drop.
 *
 * The tree is a Dumb Client view: it renders the hierarchy the server returns;
 * it never holds or mutates the ThemeConfig.
 */

'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronRight, GripVertical, Layers, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import type { RenderNode } from '@/lib/renderer-foundation';
import { SelectionModel } from './selection-model';
import type { EditorCommandEmitter, SelectionSnapshot } from './types';
import type { DragSourcePayload } from './drop-intent';
import { useSelectionEventBus } from './selection-events';
import { generateDeleteComponentCommand } from './delete-component';


interface EditorLeftSidebarProps {
  /** The RenderNode preview (the hierarchy to display). */
  readonly renderNode: RenderNode | null;
  /** The resolved selection snapshot (drives the highlighted tree node). */
  readonly selection: SelectionSnapshot;
  /** The command emitter (Dumb Client - prepare only). */
  readonly commandEmitter: EditorCommandEmitter;
}



/**
 * The palette of insertable components (ADR-014, Capability 1).
 *
 * Each item is a DRAG SOURCE. It carries a DragSourcePayload — the Semantic
 * Component Identity of the component being dragged (Amendment G). Dragging
 * NEVER mutates the ThemeConfig; it produces intent only (Amendment J).
 */
const PALETTE_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'hero', label: '히어로' },
  { id: 'text', label: '텍스트' },
  { id: 'gallery', label: '갤러리' },
  { id: 'cta', label: 'CTA' },
  { id: 'contact', label: '연락처' },
];


/**
 * The Left Sidebar zone of the Editor Shell.
 *
 * Renders the component hierarchy as a navigable tree. It is a pure Dumb
 * Client — it renders the RenderNode hierarchy via the Selection Model and
 * prepares selection; it never holds or mutates the ThemeConfig.
 */
export function EditorLeftSidebar({
  renderNode,
  selection,
  commandEmitter,
}: EditorLeftSidebarProps) {
  const entries = React.useMemo(
    () => SelectionModel.flattenTree(renderNode),
    [renderNode],
  );

  // PHASE 17.7 - COMPONENT DELETION (ADR-011D + Amendment G):
  //
  //   The tree is a SECONDARY deletion surface (the Canvas Delete/Backspace
  //   shortcut is primary). Each node exposes a delete button that emits a
  //   DeleteComponentCommand bound to the node's Semantic Component Identity
  //   (Amendment G) — the ONLY identity. The Command is handed to the
  //   EditorCommandEmitter (Dumb Client); the server performs the actual
  //   Composition.
  //
  //   The clientSequence counter is per-session (Autosave readiness).
  const clientSequenceRef = React.useRef(0);

  const handleDelete = React.useCallback(
    (semanticId: string, sectionId: string | null) => {
      const command = generateDeleteComponentCommand(
        semanticId,
        sectionId,
        ++clientSequenceRef.current,
      );
      commandEmitter.emit(command);
    },
    [commandEmitter],
  );


  // PHASE 18.1 - SELECTION EVENT BUS (Section 13):
  //
  //   The tree PUBLISHES a SelectionChanged event on the Selection Event Bus
  //   when a node is clicked. It no longer calls a prop-drilled callback. The
  //   bus is the single source of truth — Canvas, Tree, Inspector, and TopBar
  //   all subscribe to the SAME bus. No UI component manipulates another
  //   directly.
  //
  //   AMENDMENT G: The event carries ONLY the Semantic Component Identity.
  const select = useSelectionEventBus((state) => state.select);


  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-stone-200 bg-[#f8f5ed]">
      {/* Zone header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers aria-hidden="true" size={16} className="text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-800">구성 요소</h2>
        </div>
        <span className="text-xs text-stone-400">{entries.length}</span>
      </div>

      {/* PHASE 17.4 - COMPONENT PALETTE (ADR-014, Amendment J):
          The palette is the DRAG SOURCE. Each item is draggable and carries a
          DragSourcePayload — the Semantic Component Identity of the component
          being dragged (Amendment G). Dragging NEVER mutates the ThemeConfig;
          it produces intent only. The Canvas (drop zone) builds the DropIntent
          and emits an InsertComponentCommand on drop. */}
      <div className="border-b border-stone-200 px-3 py-3">
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <Plus aria-hidden="true" size={14} className="text-stone-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            컴포넌트 추가
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PALETTE_ITEMS.map((item) => (
            <PaletteItem key={item.id} id={item.id} label={item.label} />
          ))}
        </div>
      </div>

      {/* Tree body */}
      <div className="flex-1 overflow-y-auto p-2">

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MousePointerClick aria-hidden="true" size={20} className="text-stone-300" />
            <p className="text-sm text-stone-400">
              미리보기를 불러오면 구성 요소가 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5" role="tree" aria-label="구성 요소 트리">
            {entries.map((entry) => {
              // AMENDMENT G: The tree highlights the selected node by its
              // Semantic Component Identity — the ONLY selection identity.
              const isSelected = selection.selectedComponentId === entry.semanticId;
              return (
                <li key={entry.semanticId} role="treeitem" aria-selected={isSelected}>
                  <div
                    className={`group flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-amber-900 text-[#fffdf8]'
                        : 'text-stone-700 hover:bg-stone-200/60'
                    }`}
                    style={{ paddingLeft: `${8 + entry.depth * 14}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => select(entry.semanticId)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      <ChevronRight
                        aria-hidden="true"
                        size={14}
                        className={isSelected ? 'text-[#fffdf8]/70' : 'text-stone-400'}
                      />
                      <span className="truncate">{entry.label}</span>
                    </button>

                    {/* PHASE 17.7 - COMPONENT DELETION (ADR-011D + Amendment G):
                        A per-node delete button (secondary deletion surface; the
                        Canvas Delete/Backspace shortcut is primary). It emits a
                        DeleteComponentCommand bound to the node's Semantic
                        Component Identity — the ONLY identity. The Command is
                        handed to the EditorCommandEmitter (Dumb Client); the
                        server performs the actual Composition. */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        // The tree entry carries ONLY the Semantic Component
                        // Identity (Amendment G). The sectionId is resolved
                        // server-side by the DeleteComponentHandler from the
                        // semanticId — the client never needs it.
                        handleDelete(entry.semanticId, null);
                      }}

                      title={`${entry.label} 삭제`}
                      aria-label={`${entry.label} 삭제`}
                      className={`shrink-0 rounded-sm p-1 transition-colors ${
                        isSelected
                          ? 'text-[#fffdf8]/70 hover:bg-amber-800 hover:text-[#fffdf8]'
                          : 'text-stone-400 opacity-0 hover:bg-red-100 hover:text-red-600 group-hover:opacity-100'
                      }`}
                    >
                      <Trash2 aria-hidden="true" size={13} />
                    </button>
                  </div>
                </li>
              );
            })}

          </ul>
        )}
      </div>
    </aside>
  );
}

/**
 * A single draggable palette item (ADR-014, Amendment J).
 *
 * This is the DRAG SOURCE. It uses dnd-kit's `useDraggable` (WRAP) and carries
 * a DragSourcePayload — the Semantic Component Identity of the component being
 * dragged (Amendment G). Dragging NEVER mutates the ThemeConfig; it produces
 * intent only. The Canvas (drop zone) builds the DropIntent and emits an
 * InsertComponentCommand on drop.
 */
function PaletteItem({ id, label }: { readonly id: string; readonly label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${id}`,
    // AMENDMENT G: The drag payload carries ONLY the Semantic Component
    // Identity of the component being dragged — never a nodeId, DOM id, React
    // key, RenderNode id, tree index, or runtime UUID.
    data: {
      sourceComponentId: id,
      kind: 'insert',
      sectionId: null,
    } satisfies DragSourcePayload,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-center gap-1.5 rounded-sm border px-2 py-1.5 text-left text-xs font-medium transition-colors active:cursor-grabbing ${
        isDragging
          ? 'border-amber-500 bg-amber-50 text-amber-900 opacity-60'
          : 'border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50'
      }`}
    >
      <GripVertical aria-hidden="true" size={12} className="shrink-0 text-stone-400" />
      <span className="truncate">{label}</span>
    </button>
  );
}


