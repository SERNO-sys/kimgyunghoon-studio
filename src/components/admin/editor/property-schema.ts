/**
 * AWIE V2 - Phase 17.3: Property Schema (BUILD - AWIE core IP).
 *
 * ADR-013, Capability 3: The Property Schema is the declarative descriptor of
 * the editable fields for each component type. It is derived from the frozen
 * `SectionConfig` shape and the Semantic Component Identity, and it is the
 * contract that binds the inspector to the Command model.
 *
 * AMENDMENT I (UI-Agnostic Schema) - FROZEN:
 *
 *   "PropertySchema MUST remain strictly UI-agnostic. It describes domain
 *    properties only (e.g., field, type, label). It MUST NEVER contain
 *    framework components, DOM structure, CSS class names, or UI
 *    implementation details."
 *
 *   This module therefore contains ONLY domain descriptors. It imports NO React,
 *   NO DOM, NO CSS, and NO UI components. The PropertyAdapter (Amendment H) is
 *   the ONLY consumer of this schema; the Inspector consumes only the adapter
 *   output.
 *
 * AMENDMENT H (Adapter Boundary) - FROZEN:
 *
 *   "The Property Inspector MUST NEVER consume PropertySchema directly. All
 *    PropertySchema access MUST occur through the AWIE PropertyAdapter. The
 *    Inspector consumes only the adapter output."
 *
 *   This module is therefore NOT imported by any UI component. It is imported
 *   ONLY by the PropertyAdapter.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure domain-schema modeling for the Property Inspector.
 */

// ---------------------------------------------------------------------------
// Property Field Types (domain-only, UI-agnostic)
// ---------------------------------------------------------------------------

/**
 * The domain type of an editable property.
 *
 * These are PURE DOMAIN types. They describe WHAT the property is, not HOW it
 * is rendered. The PropertyAdapter maps each type to a UI-agnostic
 * PropertyDescriptor; the Inspector (React Hook Form) decides the concrete
 * control.
 *
 *   - "text":    a single-line string (e.g. a heading, a label).
 *   - "textarea": a multi-line string (e.g. a body paragraph).
 *   - "number":  a numeric value (e.g. a count, a size).
 *   - "color":   a color value (e.g. a hex string).
 *   - "select":  a choice from a fixed set of options.
 *   - "boolean": a true/false toggle.
 */
export type PropertyFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'select'
  | 'boolean';

// ---------------------------------------------------------------------------
// Property Field Descriptor (domain-only)
// ---------------------------------------------------------------------------

/**
 * A single editable property field descriptor.
 *
 * AMENDMENT I: This is a PURE DOMAIN descriptor. It describes the field's
 * domain identity (field key), its type, its human-readable label, and its
 * validation constraints. It contains NO framework components, NO DOM
 * structure, NO CSS class names, and NO UI implementation details.
 *
 * The `field` key is the Semantic Component Identity-relative path into the
 * component's props (e.g. "heading", "body", "backgroundColor"). The
 * PropertyAdapter resolves the current value from the selected RenderNode's
 * props and maps the descriptor to a UI-agnostic PropertyDescriptor.
 */
export interface PropertyFieldDescriptor {
  /** The domain field key (e.g. "heading", "body", "backgroundColor"). */
  readonly field: string;
  /** The domain type of the field. */
  readonly type: PropertyFieldType;
  /** The human-readable label shown to the user. */
  readonly label: string;
  /** The default value when the field is absent from the props. */
  readonly defaultValue: string | number | boolean;
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
// Property Schema (a named bundle of field descriptors)
// ---------------------------------------------------------------------------

/**
 * A Property Schema is a named bundle of PropertyFieldDescriptors for a
 * component type.
 *
 * AMENDMENT I: The schema is strictly UI-agnostic. It describes the domain
 * properties of a component type (e.g. "hero" has a heading, a body, and a
 * background color). It NEVER contains framework components, DOM structure,
 * CSS class names, or UI implementation details.
 *
 * The schema is keyed by the component's Semantic Component Identity segment
 * (e.g. "hero", "text", "cta"). The PropertyAdapter resolves the schema for a
 * selected component and translates it into UI-agnostic PropertyDescriptors.
 */
export interface PropertySchema {
  /** The Semantic Component Identity segment this schema describes. */
  readonly componentId: string;
  /** The ordered list of editable field descriptors. */
  readonly fields: readonly PropertyFieldDescriptor[];
}

// ---------------------------------------------------------------------------
// The Property Schema Registry (BUILD - AWIE core IP)
// ---------------------------------------------------------------------------

/**
 * The registry of Property Schemas, keyed by Semantic Component Identity
 * segment.
 *
 * This is AWIE's orchestration model: it is the contract that binds the
 * inspector to the Command model. It is derived from the frozen `SectionConfig`
 * shape and the Semantic Component Identity. It is NOT delegated to OSS.
 *
 * AMENDMENT I: Every schema here is strictly UI-agnostic. No framework
 * components, no DOM, no CSS.
 */
export const PROPERTY_SCHEMAS: readonly PropertySchema[] = [
  {
    componentId: 'hero',
    fields: [
      { field: 'heading', type: 'text', label: '제목', defaultValue: '' },
      { field: 'subheading', type: 'text', label: '부제목', defaultValue: '' },
      { field: 'body', type: 'textarea', label: '본문', defaultValue: '' },
      { field: 'backgroundColor', type: 'color', label: '배경색', defaultValue: '#ffffff' },
      { field: 'textColor', type: 'color', label: '텍스트 색', defaultValue: '#111827' },
      { field: 'align', type: 'select', label: '정렬', defaultValue: 'center', options: [
        { value: 'left', label: '왼쪽' },
        { value: 'center', label: '가운데' },
        { value: 'right', label: '오른쪽' },
      ] },
    ],
  },
  {
    componentId: 'text',
    fields: [
      { field: 'content', type: 'textarea', label: '내용', defaultValue: '' },
      { field: 'align', type: 'select', label: '정렬', defaultValue: 'left', options: [
        { value: 'left', label: '왼쪽' },
        { value: 'center', label: '가운데' },
        { value: 'right', label: '오른쪽' },
      ] },
    ],
  },
  {
    componentId: 'cta',
    fields: [
      { field: 'label', type: 'text', label: '버튼 텍스트', defaultValue: '' },
      { field: 'href', type: 'text', label: '링크', defaultValue: '#' },
      { field: 'variant', type: 'select', label: '스타일', defaultValue: 'primary', options: [
        { value: 'primary', label: '기본' },
        { value: 'secondary', label: '보조' },
        { value: 'outline', label: '윤곽선' },
      ] },
    ],
  },
  {
    componentId: 'button',
    fields: [
      { field: 'label', type: 'text', label: '버튼 텍스트', defaultValue: '' },
      { field: 'href', type: 'text', label: '링크', defaultValue: '#' },
    ],
  },
  {
    componentId: 'image',
    fields: [
      { field: 'src', type: 'text', label: '이미지 URL', defaultValue: '' },
      { field: 'alt', type: 'text', label: '대체 텍스트', defaultValue: '' },
      { field: 'rounded', type: 'boolean', label: '둥근 모서리', defaultValue: false },
    ],
  },
];

/**
 * Resolves the Property Schema for a given Semantic Component Identity segment.
 *
 * This is a PURE O(1) lookup. It is the ONLY entry point into the schema
 * registry. Per Amendment H, it is consumed ONLY by the PropertyAdapter — never
 * by the Inspector directly.
 *
 * @param componentId The Semantic Component Identity segment (e.g. "hero").
 * @returns The Property Schema, or undefined if none is registered.
 */
export function resolvePropertySchema(
  componentId: string,
): PropertySchema | undefined {
  return PROPERTY_SCHEMAS.find((schema) => schema.componentId === componentId);
}
