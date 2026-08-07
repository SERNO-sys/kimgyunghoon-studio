/**
 * AWIE V2 - Phase 17.3: Property Adapter (BUILD - AWIE core IP).
 *
 * ADR-013, Capability 3: The Property Adapter is the bridge between the
 * UI-agnostic Property Schema and the Inspector UI. It takes a domain schema
 * and the selected RenderNode's props, and translates it into UI-agnostic
 * PropertyDescriptors that the Inspector (React Hook Form) consumes.
 *
 * AMENDMENT H (Adapter Boundary) - FROZEN:
 *
 *   "The Property Inspector MUST NEVER consume PropertySchema directly. All
 *    PropertySchema access MUST occur through the AWIE PropertyAdapter. The
 *    Inspector consumes only the adapter output."
 *
 *   This module is the ONLY consumer of PropertySchema. The Inspector imports
 *   ONLY this module (and its PropertyDescriptor output) — never the schema.
 *
 * AMENDMENT I (UI-Agnostic Schema) - FROZEN:
 *
 *   The PropertySchema remains strictly UI-agnostic. The PropertyDescriptor
 *   output is ALSO UI-agnostic: it describes the field's domain identity, its
 *   current value, its type, and its constraints. It contains NO framework
 *   components, NO DOM structure, NO CSS class names, and NO UI implementation
 *   details. The Inspector decides the concrete control.
 *
 * THE ADAPTER IS A DUMB TRANSLATOR:
 *
 *   - It reads the selected RenderNode's props (the server's output).
 *   - It resolves the current value for each schema field from those props.
 *   - It produces a UI-agnostic PropertyDescriptor[].
 *   - It NEVER holds, mutates, or decides the ThemeConfig.
 *   - It NEVER emits Commands. It only prepares the descriptor the Inspector
 *     renders. The Inspector emits Commands.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure schema-to-descriptor translation for the Property Inspector.
 */

import type { RenderNode } from '@/lib/renderer-foundation';
import type { SelectionSnapshot } from './selection-model';
import {
  resolvePropertySchema,
  type PropertyFieldDescriptor,
  type PropertyFieldType,
} from './property-schema';

// ---------------------------------------------------------------------------
// Property Descriptor (UI-agnostic adapter output)
// ---------------------------------------------------------------------------

/**
 * A single UI-agnostic property descriptor produced by the PropertyAdapter.
 *
 * This is the ONLY output the Inspector consumes (Amendment H). It describes
 * the field's domain identity, its current value, its type, and its
 * constraints. It contains NO framework components, NO DOM structure, NO CSS
 * class names, and NO UI implementation details (Amendment I).
 *
 * The Inspector (React Hook Form) maps each descriptor to a concrete control
 * (text input, textarea, color input, select, toggle) and emits a Command when
 * the value changes.
 */
export interface PropertyDescriptor {
  /** The domain field key (e.g. "heading", "body", "backgroundColor"). */
  readonly field: string;
  /** The domain type of the field. */
  readonly type: PropertyFieldType;
  /** The human-readable label shown to the user. */
  readonly label: string;
  /** The current value resolved from the selected RenderNode's props. */
  readonly value: string | number | boolean;
  /** Optional select options (only for type === "select"). */
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  /** Optional minimum (only for type === "number"). */
  readonly min?: number;
  /** Optional maximum (only for type === "number"). */
  readonly max?: number;
  /** Optional step (only for type === "number"). */
  readonly step?: number;
  /** Optional placeholder text (only for text/textarea). */
  readonly placeholder?: string;
}

// ---------------------------------------------------------------------------
// Adapter Output (the full inspector binding)
// ---------------------------------------------------------------------------

/**
 * The full PropertyAdapter output for a selected component.
 *
 * This is the complete binding the Inspector consumes. It carries the selected
 * component's Semantic Component Identity (the ONLY selection identity,
 * Amendment G), the section id, and the ordered list of UI-agnostic
 * PropertyDescriptors.
 *
 * When `isEmpty` is true, the Inspector renders the empty state.
 */
export interface PropertyAdapterOutput {
  /** The Semantic Component Identity of the selected component (null when
   *  nothing is selected). This is the ONLY selection identity. */
  readonly selectedComponentId: string | null;
  /** The section id the selected component belongs to (if known). */
  readonly sectionId: string | null;
  /** The ordered list of UI-agnostic property descriptors. */
  readonly descriptors: readonly PropertyDescriptor[];
  /** Whether the selection is empty (nothing to edit). */
  readonly isEmpty: boolean;
}

// ---------------------------------------------------------------------------
// Value resolution helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Resolves the current value for a schema field from the selected RenderNode's
 * props.
 *
 * This is a PURE READ. It reads the prop value by the field key and coerces it
 * to the field's domain type. If the prop is absent, it falls back to the
 * schema's default value. It NEVER mutates anything.
 *
 * @param props The selected RenderNode's props (the server's output).
 * @param field The schema field descriptor.
 * @returns The resolved current value.
 */
function resolveValue(
  props: Record<string, unknown>,
  field: PropertyFieldDescriptor,
): string | number | boolean {
  const raw = props[field.field];
  if (raw === undefined || raw === null) {
    return field.defaultValue;
  }
  switch (field.type) {
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : field.defaultValue;
    }
    case 'boolean':
      return typeof raw === 'boolean' ? raw : Boolean(raw);
    case 'text':
    case 'textarea':
    case 'color':
    case 'select':
    default:
      return typeof raw === 'string' ? raw : String(raw);
  }
}

// ---------------------------------------------------------------------------
// The Property Adapter
// ---------------------------------------------------------------------------

/**
 * The Property Adapter.
 *
 * The bridge between the UI-agnostic Property Schema and the Inspector UI. It
 * takes a SelectionSnapshot (the resolved selection) and translates the
 * selected component's schema + props into a UI-agnostic PropertyAdapterOutput.
 *
 * AMENDMENT H: This is the ONLY consumer of PropertySchema. The Inspector
 * consumes ONLY the adapter output.
 *
 * AMENDMENT G: The adapter binds to the selected component's Semantic Component
 * Identity (`selectedComponentId`). It NEVER uses nodeId, RenderNode id, DOM
 * id, tree index, or runtime UUID.
 *
 * The adapter is a pure, stateless translator. It never holds, mutates, or
 * decides the ThemeConfig, and it never emits Commands.
 */
export class PropertyAdapter {
  /**
   * Translates a SelectionSnapshot into a UI-agnostic PropertyAdapterOutput.
   *
   * @param selection The resolved selection snapshot.
   * @returns The adapter output the Inspector consumes.
   */
  static resolve(selection: SelectionSnapshot): PropertyAdapterOutput {
    // AMENDMENT G: Bind to the Semantic Component Identity — the ONLY selection
    // identity. If nothing is selected, return the empty output.
    if (selection.isEmpty || !selection.selectedComponentId) {
      return {
        selectedComponentId: null,
        sectionId: null,
        descriptors: [],
        isEmpty: true,
      };
    }

    // Resolve the component id from the selected RenderNode. Element nodes
    // carry a componentId; text/fragment nodes have no editable schema.
    const node = selection.node;
    const componentId = node?.type === 'element' ? node.componentId : null;
    if (!componentId || node?.type !== 'element') {
      return {
        selectedComponentId: selection.selectedComponentId,
        sectionId: selection.sectionId,
        descriptors: [],
        isEmpty: false,
      };
    }

    // AMENDMENT H: The adapter is the ONLY consumer of PropertySchema. It
    // resolves the schema for the component id and translates it.
    const schema = resolvePropertySchema(componentId);
    if (!schema) {
      return {
        selectedComponentId: selection.selectedComponentId,
        sectionId: selection.sectionId,
        descriptors: [],
        isEmpty: false,
      };
    }

    // At this point `node` is narrowed to an element RenderNode (it carries
    // the editable props). The adapter reads the props as a PURE READ.
    const props = node.props;

    const descriptors: PropertyDescriptor[] = schema.fields.map((field) => ({
      field: field.field,
      type: field.type,
      label: field.label,
      value: resolveValue(props, field),
      options: field.options,
      min: field.min,
      max: field.max,
      step: field.step,
      placeholder: field.placeholder,
    }));

    return {
      selectedComponentId: selection.selectedComponentId,
      sectionId: selection.sectionId,
      descriptors,
      isEmpty: false,
    };
  }
}
