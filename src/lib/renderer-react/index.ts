/**
 * AWIE V2 - React Adapter Barrel Export (Phase 08, Milestone 2C + Phase 09B).
 *
 * The React Adapter materializes the framework-agnostic RenderNode tree into
 * React elements. It resolves every componentId through the
 * ReactComponentRegistry and NEVER assumes a componentId is an HTML tag.
 *
 * Phase 09B adds:
 *   - The ComponentAdapterRegistry (adapter-friendly component registration).
 *   - The DUMB, semantic presentation components (Hero, Text).
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure infrastructure.
 */

export type {
  ReactComponentType,
  ReactComponentRegistry,
  ReactAdapter,
  ReactRenderOptions,
} from './types';

export {
  InMemoryReactComponentRegistry,
  ReactComponentNotFoundError,
} from './registry';

export { DefaultReactAdapter } from './adapter';

export {
  SelectionInstrumentedAdapter,
  SelectionTarget,
  DATA_AWIE_ID,
  SEMANTIC_ID_METADATA_KEY,
  SELECTION_TARGET_CLASS,
} from './selection-instrumented-adapter';

export type {
  ComponentAdapterRegistry,
  ComponentResolver,
} from './component-adapter-registry';
export {
  InMemoryComponentAdapterRegistry,
  ComponentAdapterNotFoundError,
} from './component-adapter-registry';

export type { Action, HeroProps, Media, TextProps } from './components';
export { Hero, Text } from './components';
