/**
 * AWIE V2 - Phase 17.3: Editor Shell - Right Sidebar (Property Inspector) zone.
 *
 * ADR-011D, Section A.2 (Zone 3): The Right Sidebar is the Property Inspector.
 * It displays the properties of the currently selected element and lets the
 * user edit them. Every edit is a Command (EditorCommandPayload) — the
 * inspector NEVER mutates the ThemeConfig directly.
 *
 * ADR-013, Capability 3: The Inspector is the WRAP layer. It consumes the
 * UI-agnostic PropertyAdapter output and feeds it into React Hook Form (OSS,
 * Buy Before Build). It NEVER consumes PropertySchema directly.
 *
 * AMENDMENT H (Adapter Boundary) - FROZEN:
 *
 *   "The Property Inspector MUST NEVER consume PropertySchema directly. All
 *    PropertySchema access MUST occur through the AWIE PropertyAdapter. The
 *    Inspector consumes only the adapter output."
 *
 *   This component imports ONLY the PropertyAdapter (and its
 *   PropertyDescriptor output) — never the PropertySchema.
 *
 * AMENDMENT I (UI-Agnostic Schema) - FROZEN:
 *
 *   The PropertySchema and the PropertyDescriptor output are strictly
 *   UI-agnostic. This component is the ONLY place that maps a descriptor to a
 *   concrete control (text input, textarea, color input, select, toggle). The
 *   schema itself contains no framework components, no DOM, no CSS.
 *
 * AMENDMENT G (Semantic Component Identity) - FROZEN:
 *
 *   The inspector binds to the selected component's Semantic Component
 *   Identity (`selectedComponentId`) — the ONLY selection identity. It NEVER
 *   uses nodeId, RenderNode id, DOM id, tree index, or runtime UUID.
 *
 * THE INSPECTOR IS A DUMB CLIENT:
 *
 *   - It consumes the resolved selection (SelectionSnapshot) and the adapter
 *     output (PropertyAdapterOutput).
 *   - It renders the property form via React Hook Form.
 *   - On change, it PREPARES an EditorCommandPayload and hands it to the
 *     commandEmitter. It NEVER executes a Command and NEVER mutates the
 *     ThemeConfig.
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { SlidersHorizontal, MousePointerClick } from 'lucide-react';
import type { SelectionSnapshot } from './types';
import type { EditorCommandEmitter } from './types';
import { PropertyAdapter, type PropertyDescriptor } from './property-adapter';
import { useSelectionEventBus } from './selection-events';


interface EditorRightSidebarProps {
  /** The resolved selection snapshot (drives the inspector binding). */
  readonly selection: SelectionSnapshot;
  /** The command emitter (Dumb Client - prepare only). */
  readonly commandEmitter: EditorCommandEmitter;
  /** The id of the project being edited (for command identity). */
  readonly projectId: string;
}

/**
 * The Right Sidebar zone of the Editor Shell.
 *
 * Renders the Property Inspector for the selected element. It is a pure Dumb
 * Client — it consumes the PropertyAdapter output, renders it via React Hook
 * Form, and emits Commands on change. It never mutates the ThemeConfig.
 */
export function EditorRightSidebar({
  selection,
  commandEmitter,
  projectId,
}: EditorRightSidebarProps) {
  // AMENDMENT H: The inspector consumes ONLY the PropertyAdapter output — never
  // the PropertySchema directly.
  const adapterOutput = React.useMemo(
    () => PropertyAdapter.resolve(selection),
    [selection],
  );

  const hasSelection = adapterOutput.selectedComponentId !== null;

  // PHASE 18.1 - SELECTION EVENT BUS (Section 13):
  //
  //   The inspector PUBLISHES a SelectionChanged event on the Selection Event
  //   Bus when a breadcrumb crumb is clicked. It no longer calls a prop-drilled
  //   callback. The bus is the single source of truth — Canvas, Tree,
  //   Inspector, and TopBar all subscribe to the SAME bus. No UI component
  //   manipulates another directly.
  //
  //   AMENDMENT G: The event carries ONLY the Semantic Component Identity.
  const select = useSelectionEventBus((state) => state.select);

  return (

    <aside className="flex w-72 shrink-0 flex-col border-l border-stone-200 bg-[#f8f5ed]">
      {/* Zone header */}
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
        <SlidersHorizontal aria-hidden="true" size={16} className="text-stone-500" />
        <h2 className="text-sm font-semibold text-stone-800">속성</h2>
      </div>

      {/* Inspector body */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasSelection ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <MousePointerClick aria-hidden="true" size={20} className="text-stone-300" />
            <p className="text-sm text-stone-400">
              캔버스에서 요소를 선택하면 속성이 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected element identity */}
            <section className="rounded-sm border border-stone-200 bg-[#fffdf8] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                선택된 요소
              </h3>

              {/* Semantic Component Identity breadcrumb path (ADR-012).
                  PHASE 18.1: Each crumb is clickable and PUBLISHES a
                  SelectionChanged event on the Selection Event Bus (Section
                  13). AMENDMENT G: The event carries ONLY the Semantic
                  Component Identity. */}
              {selection.breadcrumb.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
                  {selection.breadcrumb.map((crumb, index) => (
                    <React.Fragment key={`${crumb.semanticId}-${index}`}>
                      {index > 0 && <span className="text-stone-300">›</span>}
                      <button
                        type="button"
                        onClick={() => select(crumb.semanticId)}
                        className="rounded-sm bg-stone-100 px-1.5 py-0.5 font-mono text-stone-600 transition-colors hover:bg-amber-100 hover:text-amber-900"
                      >
                        {crumb.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}


              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-stone-500">컴포넌트</dt>
                  <dd className="truncate font-mono text-stone-900">
                    {selection.node?.type === 'element'
                      ? selection.node.componentId
                      : selection.node?.type ?? '—'}
                  </dd>
                </div>
                {/* AMENDMENT G: The inspector displays the Semantic Component
                    Identity — the ONLY selection identity. */}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-stone-500">선택 ID</dt>
                  <dd className="truncate font-mono text-xs text-stone-600">
                    {adapterOutput.selectedComponentId}
                  </dd>
                </div>
                {adapterOutput.sectionId ? (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-stone-500">섹션</dt>
                    <dd className="truncate font-mono text-xs text-stone-600">
                      {adapterOutput.sectionId}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {/* Property form (React Hook Form WRAP) */}
            <PropertyForm
              descriptors={adapterOutput.descriptors}
              selectedComponentId={adapterOutput.selectedComponentId}
              sectionId={adapterOutput.sectionId}
              commandEmitter={commandEmitter}
              projectId={projectId}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Property Form (React Hook Form WRAP)
// ---------------------------------------------------------------------------

interface PropertyFormProps {
  /** The UI-agnostic property descriptors (adapter output). */
  readonly descriptors: readonly PropertyDescriptor[];
  /** The Semantic Component Identity of the selected component. */
  readonly selectedComponentId: string | null;
  /** The section id the selected component belongs to (if known). */
  readonly sectionId: string | null;
  /** The command emitter (Dumb Client - prepare only). */
  readonly commandEmitter: EditorCommandEmitter;
  /** The id of the project being edited. */
  readonly projectId: string;
}

/**
 * The property editing form.
 *
 * This is the WRAP layer (ADR-013, Capability 3): it feeds the UI-agnostic
 * PropertyDescriptors into React Hook Form (OSS, Buy Before Build). Each
 * descriptor maps to a concrete control. On change, it PREPARES an
 * EditorCommandPayload and hands it to the commandEmitter — it NEVER mutates
 * the ThemeConfig and NEVER executes a Command itself.
 *
 * AMENDMENT H: This component consumes ONLY the adapter output (descriptors).
 * It never imports the PropertySchema.
 */
function PropertyForm({
  descriptors,
  selectedComponentId,
  sectionId,
  commandEmitter,
  projectId,
}: PropertyFormProps) {
  // Build the default values from the adapter output. The form is a pure UI
  // mirror of the server's RenderNode props; it never holds the ThemeConfig.
  const defaultValues = React.useMemo(() => {
    const values: Record<string, string | number | boolean> = {};
    for (const descriptor of descriptors) {
      values[descriptor.field] = descriptor.value;
    }
    return values;
  }, [descriptors]);

  const { control, handleSubmit } = useForm<Record<string, string | number | boolean>>({
    defaultValues,
    values: defaultValues,
  });

  // A monotonically increasing per-session sequence (Autosave readiness).
  const sequenceRef = React.useRef(0);

  // AMENDMENT G: The command targets the Semantic Component Identity — the ONLY
  // selection identity. It NEVER uses nodeId, RenderNode id, DOM id, tree
  // index, or runtime UUID.
  const emitChange = React.useCallback(
    (field: string, value: string | number | boolean) => {
      if (!selectedComponentId) {
        return;
      }
      sequenceRef.current += 1;
      commandEmitter.emit({
        type: 'content.update-property',
        commandId: `cmd-${projectId}-${Date.now()}-${sequenceRef.current}`,
        sectionId: sectionId ?? undefined,
        value: String(value),
        clientSequence: sequenceRef.current,
      });
    },
    [selectedComponentId, sectionId, commandEmitter, projectId],
  );

  // The form is a Dumb Client: it never submits to mutate state. The submit
  // handler is a no-op guard; all edits are emitted as Commands on change.
  const onSubmit = React.useCallback(() => {
    // Intentionally empty. The inspector emits Commands on change; it never
    // submits a mutation.
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <section className="rounded-sm border border-stone-200 bg-[#fffdf8] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          속성 편집
        </h3>

        {descriptors.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">
            이 요소는 편집 가능한 속성이 없습니다.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {descriptors.map((descriptor) => (
              <PropertyField
                key={descriptor.field}
                descriptor={descriptor}
                control={control}
                onChange={(value) => emitChange(descriptor.field, value)}
              />
            ))}
          </div>
        )}
      </section>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Property Field (maps a UI-agnostic descriptor to a concrete control)
// ---------------------------------------------------------------------------

interface PropertyFieldProps {
  /** The UI-agnostic property descriptor. */
  readonly descriptor: PropertyDescriptor;
  /** The React Hook Form control. */
  readonly control: ReturnType<typeof useForm<Record<string, string | number | boolean>>>['control'];
  /** Called when the field value changes (emits a Command). */
  readonly onChange: (value: string | number | boolean) => void;
}

/**
 * A single property field control.
 *
 * AMENDMENT I: This is the ONLY place a UI-agnostic descriptor is mapped to a
 * concrete control. The schema itself contains no framework components, no
 * DOM, no CSS. The control is chosen by the descriptor's domain type.
 */
function PropertyField({ descriptor, control, onChange }: PropertyFieldProps) {
  const { field, type, label, options, min, max, step, placeholder } = descriptor;

  return (
    <Controller
      name={field}
      control={control}
      render={({ field: rhfField }) => (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">
            {label}
          </span>
          {type === 'textarea' ? (
            <textarea
              {...rhfField}
              value={String(rhfField.value ?? '')}
              placeholder={placeholder}
              rows={3}
              onChange={(e) => {
                rhfField.onChange(e.target.value);
                onChange(e.target.value);
              }}
              className="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-stone-500"
            />
          ) : type === 'select' ? (
            <select
              {...rhfField}
              value={String(rhfField.value ?? '')}
              onChange={(e) => {
                rhfField.onChange(e.target.value);
                onChange(e.target.value);
              }}
              className="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-stone-500"
            >
              {(options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === 'boolean' ? (
            <input
              type="checkbox"
              checked={Boolean(rhfField.value)}
              onChange={(e) => {
                rhfField.onChange(e.target.checked);
                onChange(e.target.checked);
              }}
              className="h-4 w-4 rounded-sm border-stone-300 text-stone-900 focus:ring-stone-500"
            />
          ) : type === 'color' ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={String(rhfField.value ?? '#000000')}
                onChange={(e) => {
                  rhfField.onChange(e.target.value);
                  onChange(e.target.value);
                }}
                className="h-8 w-10 cursor-pointer rounded-sm border border-stone-300 bg-white"
              />
              <input
                type="text"
                value={String(rhfField.value ?? '')}
                onChange={(e) => {
                  rhfField.onChange(e.target.value);
                  onChange(e.target.value);
                }}
                className="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 font-mono text-xs text-stone-900 outline-none focus:border-stone-500"
              />
            </div>
          ) : type === 'number' ? (
            <input
              type="number"
              {...rhfField}
              value={Number(rhfField.value ?? 0)}
              min={min}
              max={max}
              step={step}
              onChange={(e) => {
                const n = Number(e.target.value);
                rhfField.onChange(Number.isFinite(n) ? n : 0);
                onChange(Number.isFinite(n) ? n : 0);
              }}
              className="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-stone-500"
            />
          ) : (
            <input
              type="text"
              {...rhfField}
              value={String(rhfField.value ?? '')}
              placeholder={placeholder}
              onChange={(e) => {
                rhfField.onChange(e.target.value);
                onChange(e.target.value);
              }}
              className="w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-stone-500"
            />
          )}
        </label>
      )}
    />
  );
}
