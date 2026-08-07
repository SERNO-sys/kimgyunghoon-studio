/**
 * AWIE V2 - Generic Renderer barrel export.
 *
 * The Renderer is the third pillar of the AWIE architecture:
 *
 *   AI decides -> ThemeConfig describes -> Renderer renders.
 *
 * This module exposes the registry, resource map builder, theme provider,
 * generic fallback, telemetry helpers, and the core rendering engine.
 */
export {
  type RendererContext,
  type RendererTelemetry,
  type RendererTelemetryEvent,
  RendererTelemetryEventType,
  type ResourceMap,
  type SectionComponent,
  type SectionProps,
  type SectionType,
  type ThemeTokens,
  type PreRenderHook,
  type PostRenderHook,
  type RenderMiddleware,
  noopRendererTelemetry,
} from './types';

export {
  DefaultSectionRegistry,
  DuplicateRegistrationError,
  type ComponentMetadata,
  type RegistryEntry,
  type RendererPlugin,
  type SectionRegistry,
} from './registry';

export { buildResourceMap } from './resource-map';

export {
  ThemeContext,
  ThemeProvider,
  useTheme,
  resolveThemeTokens,
  type ThemeProviderProps,
} from './theme-provider';

export { GenericSection } from './GenericSection';

export { trackRender, safeRecord } from './telemetry';

export {
  RenderEngine,
  type RenderEngineProps,
} from './engine';
