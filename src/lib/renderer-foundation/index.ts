/**
 * AWIE V2 - Renderer Foundation barrel export.
 *
 * The Renderer Foundation is the framework-agnostic core of the rendering
 * pipeline. It defines the contracts that ANY concrete renderer (React, Vue,
 * Vanilla JS, ...) must implement. It contains NO UI components and NO business
 * logic.
 *
 * THE RENDERING PIPELINE (Adapter Pattern):
 *
 *   ThemeEngine -> RenderNode -> React Adapter -> React UI
 *
 * Phase 08 is DESIGN ONLY. No concrete React/Vue components or adapters are
 * implemented yet.
 */
export type {
  AssetResolver,
  ComponentRegistry,
  LayoutRegistry,
  LayoutRenderer,
  RenderContext,
  RendererComponent,
  RenderNode,
  RenderNodeType,
  RenderOptions,
  RenderRegistries,
  ResourceMap,
  ResourceRegistry,
  SkinRegistry,
  SkinResource,
  ThemeEngine,
  ThemeResourceBuilder,
  ThemeValidator,
  TypographyRegistry,
  TypographyResource,
} from './types';

export { InMemoryResourceRegistry, RegistryFrozenError } from './registry';

export {
  DefaultThemeResourceBuilder,
  DefaultThemeValidator,
  ThemeValidationError,
} from './pipeline';

export { DefaultThemeEngine } from './engine';

export type { CssVariableDictionary, StyleAdapter } from './style-adapter';
export { DefaultStyleAdapter } from './style-adapter';
