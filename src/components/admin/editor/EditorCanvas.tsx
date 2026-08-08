/**
 * AWIE V2 - Phase 17.4: Editor Shell - Main Canvas zone (Drag & Drop).
 *
 * ADR-011D, Section A.2 (Zone 2): The Main Canvas renders the live RenderNode
 * preview, supports responsive breakpoints (desktop / tablet / mobile), and
 * implements the Selection Model (clicking an element selects it).
 *
 * PHASE 17.4 - DRAG & DROP (ADR-014):
 *
 *   The Canvas is the DROP ZONE. It hosts the DndContext (dnd-kit, WRAP) and
 *   renders each top-level section as a droppable target. The pipeline is:
 *
 *     Drag Event -> DropIntent -> InsertComponentCommand -> EditorCommandEmitter
 *
 *   - AMENDMENT J (Drag Is Intent Only): Dragging NEVER mutates ThemeConfig.
 *     On drop, the canvas builds a DropIntent, generates an
 *     InsertComponentCommand, and hands it to the EditorCommandEmitter. The
 *     server performs the actual Composition.
 *
 *   - AMENDMENT K (Preview Is Disposable): The ghost (DragOverlay) and the
 *     insertion line are strictly disposable visual state. They are NEVER
 *     written to ThemeConfig, RenderNode, or SelectionSnapshot.
 *
 *   - AMENDMENT L (Drop Target Is Semantic): Drop targets are identified ONLY
 *     by Semantic Component Identity. The insertion line is positioned by the
 *     hovered target's Semantic Component Identity — never by DOM coordinates
 *     as persistent identity.
 *
 *   - AMENDMENT M (Preview Is Not Composition): The DragOverlay is a visual
 *     approximation only. Composition occurs ONLY after the server accepts the
 *     Command.
 *
 * AMENDMENT G - DOM RULE (Section 12):
 *
 *   The ONLY selection identity attribute permitted on the DOM is
 *   `data-awie-id` (the Semantic Component Identity). `data-node-id` and
 *   `data-component-id` are FORBIDDEN. The DOM is an implementation detail and
 *   MUST NEVER become architecture.
 *
 * The canvas is a pure renderer + selection layer + drop zone. It never holds
 * the ThemeConfig and never decides layout.
 */

'use client';

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';

import { Monitor, Smartphone, Tablet, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import type { RenderNode } from '@/lib/renderer-foundation';
import type { EditorCommandEmitter } from './types';
import { InMemoryReactComponentRegistry, DATA_AWIE_ID } from '@/lib/renderer-react';
import { Hero, Text } from '@/lib/renderer-react/components';
import { SelectionModel } from './selection-model';
import {
  DropIntentAdapter,
  generateInsertComponentCommand,
  generateMoveComponentCommand,
  type DragSourcePayload,
  type DropTargetPayload,
} from './drop-intent';

import {
  generateUpdateComponentCommand,
  isInlineEditable,
} from './inline-editing';
import { generateDeleteComponentCommand } from './delete-component';
import { InlineEditPreview } from './InlineEditPreview';
import { useSelectionEventBus } from './selection-events';


import {
  DEFAULT_ZOOM,
  EDITOR_VIEWPORT_WIDTHS,
  EDITOR_ZOOM_LEVELS,
  type EditorViewport,
  type EditorZoom,
  type SelectionSnapshot,
} from './types';

interface EditorCanvasProps {
  /** The RenderNode preview to render. */
  readonly renderNode: RenderNode | null;
  /** The active viewport. */
  readonly viewport: EditorViewport;
  /** Called when the viewport changes. */
  readonly onViewportChange: (viewport: EditorViewport) => void;
  /** The resolved selection snapshot (drives the overlay geometry). */
  readonly selection: SelectionSnapshot;
  /** The command emitter (Dumb Client - prepare only). */
  readonly commandEmitter: EditorCommandEmitter;
}


/** The viewport toggle options. */
const VIEWPORT_OPTIONS: Array<{ value: EditorViewport; label: string; icon: typeof Monitor }> = [
  { value: 'desktop', label: '데스크톱', icon: Monitor },
  { value: 'tablet', label: '태블릿', icon: Tablet },
  { value: 'mobile', label: '모바일', icon: Smartphone },
];

/**
 * The Main Canvas zone of the Editor Shell.
 *
 * Renders the RenderNode preview at the selected viewport width and zoom. It is
 * a pure renderer + selection layer + drop zone — it never holds the ThemeConfig
 * and never decides layout.
 *
 * SELECTION OVERLAY RULE (enforced): selection is drawn on a transparent
 * overlay layer that sits ABOVE the rendered Theme. We NEVER mutate a
 * component's CSS/border directly to show selection. The overlay is a separate
 * absolutely-positioned layer; the Theme itself is never touched.
 *
 * DRAG & DROP RULE (ADR-014, Amendment K): the ghost (DragOverlay) and the
 * insertion line are strictly disposable visual state. They are NEVER written
 * to ThemeConfig, RenderNode, or SelectionSnapshot.
 */
export function EditorCanvas({
  renderNode,
  viewport,
  onViewportChange,
  selection,
  commandEmitter,
}: EditorCanvasProps) {
  const width = EDITOR_VIEWPORT_WIDTHS[viewport];
  const [zoom, setZoom] = React.useState<EditorZoom>(DEFAULT_ZOOM);

  // PHASE 18.1 - SELECTION EVENT BUS (Section 13):
  //
  //   The Canvas PUBLISHES a SelectionChanged event on the Selection Event Bus
  //   when an element is clicked. It no longer calls a prop-drilled callback.
  //   The bus is the single source of truth — Canvas, Tree, Inspector, and
  //   TopBar all subscribe to the SAME bus. No UI component manipulates another
  //   directly.
  //
  //   AMENDMENT G: The event carries ONLY the Semantic Component Identity.
  const select = useSelectionEventBus((state) => state.select);

  // The preview frame ref is used to compute the selection overlay geometry
  // relative to the rendered Theme (which is scaled by zoom).
  const frameRef = React.useRef<HTMLDivElement | null>(null);


  // PHASE 17.4 - DRAG & DROP STATE (ADR-014):
  //
  //   - `activeDrag` is the DragSourcePayload of the currently-dragged item
  //     (Semantic Component Identity only, Amendment G). It drives the
  //     DragOverlay ghost.
  //   - `dropTargetSemanticId` is the Semantic Component Identity of the
  //     currently-hovered drop target (Amendment L). It drives the ephemeral
  //     insertion line.
  //
  //   AMENDMENT K: Both are strictly disposable visual state. They are cleared
  //   on drop or cancel and are NEVER written to ThemeConfig, RenderNode, or
  //   SelectionSnapshot.
  const [activeDrag, setActiveDrag] = React.useState<DragSourcePayload | null>(null);
  const [dropTargetSemanticId, setDropTargetSemanticId] = React.useState<string | null>(null);

  // The clientSequence counter for generated Commands (Autosave readiness).
  const clientSequenceRef = React.useRef(0);

  // The component registry (resolves componentId -> React component). It is
  // created once and reused across renders. The InlineEditPreview consumes it
  // to materialize the RenderNode preview.
  const registryRef = React.useRef<InMemoryReactComponentRegistry | null>(null);
  if (registryRef.current === null) {
    const registry = new InMemoryReactComponentRegistry();
    registry.register('hero', Hero);
    registry.register('text', Text);
    registryRef.current = registry;
  }

  // PHASE 17.6 - INLINE EDITING STATE (ADR-011D, Zone 4):

  //
  //   `editingSemanticId` is the Semantic Component Identity of the node
  //   currently being edited, or null when no node is being edited (Amendment
  //   G). When set, the InlineEditPreview swaps that node for the isolated
  //   LexicalInlineEditor.
  const [editingSemanticId, setEditingSemanticId] = React.useState<string | null>(null);


  // dnd-kit sensors (pointer). The keyboard sensor is a future capability
  // (ADR-014, Accessibility); pointer is sufficient for the Phase 17.4
  // prototype.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // The top-level sections of the RenderNode tree. These are the drop targets
  // (ADR-014, Capability 1). Each is identified ONLY by its Semantic Component
  // Identity (Amendment L).
  const sectionTargets = React.useMemo(() => {
    if (!renderNode) {
      return [];
    }
    return SelectionModel.flattenTree(renderNode).filter((entry) => entry.depth === 1);
  }, [renderNode]);

  // The selection overlay geometry. Computed from the selected component's DOM
  // element (the first element child of the selection target wrapper). This is
  // a PURE UI computation — it reads the DOM, never the ThemeConfig.
  //
  // AMENDMENT G: The DOM lookup uses `data-awie-id` (the Semantic Component
  // Identity) — the ONLY selection identity attribute permitted on the DOM.
  const overlayGeometry = React.useMemo(() => {
    if (!selection.selectedComponentId || !frameRef.current) {
      return null;
    }
    const target = frameRef.current.querySelector<HTMLElement>(
      `[${DATA_AWIE_ID}="${selection.selectedComponentId}"]`,
    );
    if (!target) {
      return null;
    }
    // The selection target wrapper is `display: contents` (no box). Its first
    // element child is the actual rendered component root, which has a real
    // bounding box.
    const root = target.firstElementChild as HTMLElement | null;
    const el = root ?? target;
    const rect = el.getBoundingClientRect();
    const frameRect = frameRef.current.getBoundingClientRect();
    return {
      top: rect.top - frameRect.top,
      left: rect.left - frameRect.left,
      width: rect.width,
      height: rect.height,
    };
  }, [selection.selectedComponentId, zoom]);

  const hasSelection = selection.selectedComponentId !== null;

  // PHASE 17.4 - DRAG & DROP HANDLERS (ADR-014):
  //
  //   AMENDMENT J (Drag Is Intent Only): These handlers produce intent only.
  //   They NEVER mutate the ThemeConfig. On drop, the canvas builds a
  //   DropIntent, generates an InsertComponentCommand, and hands it to the
  //   EditorCommandEmitter. The server performs the actual Composition.
  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const payload = event.active.data.current as DragSourcePayload | undefined;
    if (payload) {
      setActiveDrag(payload);
    }
  }, []);

  const handleDragOver = React.useCallback((event: DragEndEvent) => {
    const target = event.over?.data.current as DropTargetPayload | undefined;
    // AMENDMENT L: The drop target is identified ONLY by its Semantic Component
    // Identity. Visual coordinates are transient and are NOT part of the state.
    setDropTargetSemanticId(target?.targetSemanticId ?? null);
  }, []);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const source = event.active.data.current as DragSourcePayload | undefined;
      const target = event.over?.data.current as DropTargetPayload | undefined;

      // Build the generic DropIntent via the dnd-kit adapter (the ONLY consumer
      // of dnd-kit in the editor).
      const intent = DropIntentAdapter.fromDragEvent(source ?? null, target ?? null);

      if (intent) {
        // AMENDMENT J: The generated Command is intent only. It is handed to the
        // EditorCommandEmitter, which sends it to the Server-Side Orchestration
        // API. The client NEVER applies the Command itself.
        //
        // PHASE 17.8 - COMPONENT MOVE (REORDER): A MOVE intent (dragging an
        // EXISTING section onto another section) generates a
        // MoveComponentCommand; an INSERT intent (dragging a NEW palette item)
        // generates an InsertComponentCommand. Both bind to Semantic Component
        // Identity only (Amendment G / Amendment L).
        const command =
          intent.kind === 'move'
            ? generateMoveComponentCommand(intent, ++clientSequenceRef.current)
            : generateInsertComponentCommand(intent, ++clientSequenceRef.current);
        commandEmitter.emit(command);
      }


      // AMENDMENT K: Clear the disposable drag state on drop.
      setActiveDrag(null);
      setDropTargetSemanticId(null);
    },
    [commandEmitter],
  );

  const handleDragCancel = React.useCallback(() => {
    // AMENDMENT K: Clear the disposable drag state on cancel.
    setActiveDrag(null);
    setDropTargetSemanticId(null);
  }, []);

  // PHASE 17.6 - INLINE EDITING HANDLERS (ADR-011D, Zone 4):
  //
  //   AMENDMENT G: The edited node is identified ONLY by its Semantic Component
  //   Identity (`data-awie-id`). Double-clicking an editable component swaps it
  //   for the isolated LexicalInlineEditor.
  //
  //   AMENDMENT L: The LexicalInlineEditor is isolated. On save, THIS handler
  //   (the integration layer) translates the editor's plain-text output into an
  //   UpdateComponentCommand and hands it to the EditorCommandEmitter. The
  //   server performs the actual Composition.
  const handleDoubleClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Resolve the double-clicked component from the selection-instrumented
      // DOM via `data-awie-id` (the Semantic Component Identity, Amendment G).
      const target = (event.target as HTMLElement).closest(
        `[${DATA_AWIE_ID}]`,
      ) as HTMLElement | null;
      const semanticId = target?.getAttribute(DATA_AWIE_ID);
      if (!semanticId) {
        return;
      }
      // Only editable components (Semantic Component Identity based) enter
      // inline editing. Non-editable components ignore double-click.
      if (!isInlineEditable(semanticId)) {
        return;
      }
      setEditingSemanticId(semanticId);
    },
    [],
  );

  // Commit an inline edit: translate the editor's plain-text output into an
  // UpdateComponentCommand and hand it to the EditorCommandEmitter.
  //
  // AMENDMENT L: This is the integration layer translating editor events into
  // AWIE commands. The LexicalInlineEditor never sees this Command.
  const handleInlineSave = React.useCallback(
    (semanticId: string, value: string) => {
      const command = generateUpdateComponentCommand(
        {
          semanticId,
          sectionId: selection.sectionId,
          value,
        },
        ++clientSequenceRef.current,
      );
      commandEmitter.emit(command);
      setEditingSemanticId(null);
    },
    [commandEmitter, selection.sectionId],
  );

  // Cancel an inline edit (Escape). No save occurs.
  const handleInlineCancel = React.useCallback(() => {
    setEditingSemanticId(null);
  }, []);

  // PHASE 17.7 - COMPONENT DELETION (ADR-011D + Amendment G):
  //
  //   The Canvas is the PRIMARY deletion surface. Pressing Delete/Backspace
  //   while a component is selected emits a DeleteComponentCommand. The Command
  //   binds to the selected Semantic Component Identity (Amendment G) — the ONLY
  //   identity. It is handed to the EditorCommandEmitter (Dumb Client); the
  //   server performs the actual Composition.
  //
  //   GUARDS:
  //     - No-op when nothing is selected.
  //     - No-op while an inline edit is active (so Delete edits text, not the
  //       composition).
  //     - No-op when the event target is an editable field (input/textarea/
  //       contenteditable) so Delete never hijacks text editing.
  const handleDeleteKey = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }
      // Never hijack text editing (inline editor, inspector inputs, etc.).
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      // No-op while an inline edit is active.
      if (editingSemanticId) {
        return;
      }
      const semanticId = selection.selectedComponentId;
      if (!semanticId) {
        return;
      }
      event.preventDefault();
      const command = generateDeleteComponentCommand(
        semanticId,
        selection.sectionId,
        ++clientSequenceRef.current,
      );
      commandEmitter.emit(command);
    },
    [commandEmitter, editingSemanticId, selection.selectedComponentId, selection.sectionId],
  );

  // Attach the Delete/Backspace key listener for the lifetime of the Canvas.
  React.useEffect(() => {
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [handleDeleteKey]);

  return (


    <main className="flex min-w-0 flex-1 flex-col bg-stone-100">
      {/* Canvas toolbar: viewport switcher + zoom controls */}
      <div className="flex items-center justify-between border-b border-stone-200 bg-[#fffdf8] px-4 py-2">
        <div className="flex items-center gap-1 rounded-sm border border-stone-200 bg-white p-0.5">
          {VIEWPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = viewport === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewportChange(option.value)}
                aria-pressed={isActive}
                title={option.label}
                className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-900 text-[#fffdf8]'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Icon aria-hidden="true" size={15} />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
        </div>

        {/* Zoom controls (25% / 50% / 75% / 100% / 150% / Fit) */}
        <div className="flex items-center gap-1 rounded-sm border border-stone-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() =>
              setZoom((prev) => {
                const idx = EDITOR_ZOOM_LEVELS.indexOf(prev);
                return EDITOR_ZOOM_LEVELS[Math.max(0, idx - 1)];
              })
            }
            disabled={zoom === EDITOR_ZOOM_LEVELS[0]}
            title="축소"
            aria-label="축소"
            className="inline-flex items-center rounded-sm px-2 py-1 text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
          >
            <ZoomOut aria-hidden="true" size={15} />
          </button>

          <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-stone-600">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() =>
              setZoom((prev) => {
                const idx = EDITOR_ZOOM_LEVELS.indexOf(prev);
                return EDITOR_ZOOM_LEVELS[Math.min(EDITOR_ZOOM_LEVELS.length - 1, idx + 1)];
              })
            }
            disabled={zoom === EDITOR_ZOOM_LEVELS[EDITOR_ZOOM_LEVELS.length - 1]}
            title="확대"
            aria-label="확대"
            className="inline-flex items-center rounded-sm px-2 py-1 text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
          >
            <ZoomIn aria-hidden="true" size={15} />
          </button>

          <button
            type="button"
            onClick={() => setZoom(DEFAULT_ZOOM)}
            title="100%"
            aria-label="100%"
            className="inline-flex items-center rounded-sm px-2 py-1 text-stone-600 transition-colors hover:bg-stone-100"
          >
            <Maximize aria-hidden="true" size={15} />
          </button>
        </div>

        <span className="text-xs text-stone-400">{width}px</span>
      </div>

      {/* Canvas body: scrollable preview area */}
      <div className="flex-1 overflow-auto p-6">
        <div
          className="mx-auto transition-all duration-200"
          style={{ maxWidth: width * zoom, transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        >
          <div
            className="overflow-hidden rounded-sm border border-stone-300 bg-white shadow-sm"
            style={{ width: '100%', minHeight: '60vh' }}
          >
            {renderNode ? (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="relative">
                  {/* The rendered Theme (never mutated for selection or drag). */}
                  <div
                    ref={frameRef}
                    onClick={(event) => {
                      // PHASE 17.2 - SELECTION MODEL (AMENDMENT G):
                      // Resolve the clicked component from the selection-
                      // instrumented DOM. The SelectionInstrumentedAdapter
                      // injects `data-awie-id` (the Semantic Component Identity)
                      // onto every rendered element. Clicking any descendant
                      // resolves to the nearest selection target. The resolved
                      // value is the Semantic Component Identity — NEVER a
                      // nodeId, RenderNode id, DOM id, tree index, or runtime
                      // UUID.
                      const target = (event.target as HTMLElement).closest(
                        `[${DATA_AWIE_ID}]`,
                      ) as HTMLElement | null;
                      if (target) {
                        select(target.getAttribute(DATA_AWIE_ID));
                      }

                    }}
                    onDoubleClick={handleDoubleClick}
                  >
                    <InlineEditPreview
                      renderNode={renderNode}
                      registry={registryRef.current}
                      editingSemanticId={editingSemanticId}
                      onSave={handleInlineSave}
                      onCancel={handleInlineCancel}
                    />
                  </div>


                  {/* SELECTION OVERLAY LAYER (strictly separated from the Theme).
                      Transparent, pointer-events-none, absolutely positioned above
                      the rendered Theme. Selection is drawn HERE — never on the
                      component's own CSS/border. The bounding box is computed from
                      the selected component's DOM geometry. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10"
                    data-selection-overlay
                  >
                    {hasSelection && overlayGeometry && (
                      <div
                        className="absolute ring-2 ring-inset ring-amber-500/70"
                        style={{
                          top: overlayGeometry.top,
                          left: overlayGeometry.left,
                          width: overlayGeometry.width,
                          height: overlayGeometry.height,
                        }}
                      />
                    )}
                  </div>

                  {/* PHASE 17.4 - DROP TARGETS (ADR-014, Amendment L):
                      Each top-level section is a droppable target, identified
                      ONLY by its Semantic Component Identity. The drop target
                      wrapper is `display: contents` so it never affects layout.
                      The ephemeral insertion line is drawn on the overlay layer
                      (Amendment K) — never on the Theme. */}
                  {sectionTargets.map((entry) => (
                    <DroppableSection
                      key={entry.semanticId}
                      semanticId={entry.semanticId}
                      sectionId={entry.semanticId}
                      isActive={dropTargetSemanticId === entry.semanticId}
                    />
                  ))}

                  {/* PHASE 17.4 - EPHEMERAL INSERTION LINE (ADR-014, Amendment K):
                      Drawn on the overlay layer when a drop target is hovered.
                      It is strictly disposable visual state — NEVER written to
                      ThemeConfig, RenderNode, or SelectionSnapshot. */}
                  {activeDrag && dropTargetSemanticId && (
                    <InsertionLine
                      frameRef={frameRef}
                      targetSemanticId={dropTargetSemanticId}
                    />
                  )}
                </div>

                {/* PHASE 17.4 - DRAG OVERLAY GHOST (ADR-014, Amendment M):
                    A visual approximation of the dragged palette item. It is
                    strictly disposable — Composition occurs ONLY after the
                    server accepts the Command. */}
                <DragOverlay dropAnimation={null}>
                  {activeDrag ? (
                    <div className="rounded-sm border border-amber-500 bg-[#fffdf8] px-3 py-2 text-sm font-medium text-amber-900 shadow-lg">
                      {activeDrag.sourceComponentId}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <div className="flex h-[60vh] items-center justify-center text-stone-400">
                미리보기를 불러오는 중...
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * A droppable drop target for a top-level section.
 *
 * AMENDMENT L: The drop target is identified ONLY by its Semantic Component
 * Identity. The wrapper is `display: contents` so it never affects layout. The
 * ephemeral insertion line is drawn on the overlay layer (Amendment K).
 */
function DroppableSection({
  semanticId,
  sectionId,
  isActive,
}: {
  readonly semanticId: string;
  readonly sectionId: string;
  readonly isActive: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: semanticId as UniqueIdentifier,
    data: { targetSemanticId: semanticId, sectionId } satisfies DropTargetPayload,
  });

  return (
    <div
      ref={setNodeRef}
      data-drop-target={semanticId}
      className="pointer-events-none absolute inset-x-0"
      style={{ display: 'contents' }}
      aria-hidden="true"
    >
      {/* The active drop target is highlighted via the overlay layer only. */}
      {isActive ? <span className="sr-only">드롭 대상: {semanticId}</span> : null}
    </div>
  );
}

/**
 * The ephemeral insertion line.
 *
 * AMENDMENT K: This is strictly disposable visual state. It is drawn on the
 * overlay layer and NEVER written to ThemeConfig, RenderNode, or SelectionSnapshot.
 *
 * AMENDMENT L: The line is positioned by the hovered target's Semantic Component
 * Identity (via `data-awie-id` DOM lookup) — never by DOM coordinates as
 * persistent identity. Visual coordinates are transient only.
 */
function InsertionLine({
  frameRef,
  targetSemanticId,
}: {
  readonly frameRef: React.RefObject<HTMLDivElement | null>;
  readonly targetSemanticId: string;
}) {
  const geometry = React.useMemo(() => {
    const frame = frameRef.current;
    if (!frame) {
      return null;
    }
    const target = frame.querySelector<HTMLElement>(
      `[${DATA_AWIE_ID}="${targetSemanticId}"]`,
    );
    if (!target) {
      return null;
    }
    const root = target.firstElementChild as HTMLElement | null;
    const el = root ?? target;
    const rect = el.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    return {
      top: rect.top - frameRect.top,
      left: rect.left - frameRect.left,
      width: rect.width,
    };
  }, [frameRef, targetSemanticId]);

  if (!geometry) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-20"
      style={{
        top: geometry.top - 2,
        left: geometry.left,
        width: geometry.width,
        height: 4,
        backgroundColor: '#f59e0b',
        borderRadius: 2,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
      }}
    />
  );
}


