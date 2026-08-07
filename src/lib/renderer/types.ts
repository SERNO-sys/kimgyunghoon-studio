/**
 * AWIE V2 - Generic Renderer Types.
 *
 * The Renderer is the third pillar of the AWIE architecture:
 *
 *   AI decides -> ThemeConfig describes -> Renderer renders.
 *
 * The Renderer treats ThemeConfig as an IMMUTABLE input. It never mutates it
 * and never branches on business semantics (e.g. `if (industry === ...)` is
 * strictly prohibited). Rendering is deterministic and side-effect free.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic. It is
 * pure type modeling for the rendering pipeline.
 */

import type {
  AssetConfig,
  PageConfig,
  SectionConfig,
  ThemeConfig,
} from '../theme-config/v2';

/**
 * The type of a section. Declared as a plain string so the registry can be
 * extended by external plugins without recompiling the core. Concrete section
 * types (hero, text, ...) are just string values.
 */
export type SectionType = string;

/**
 * The standardized props every registered section component must accept.
 *
 *   - section: the self-contained SectionConfig (content + settings).
 *   - theme:   the resolved ThemeTokens (colors, spacing, typography, ...).
 *   - context: renderer context (route, page, resource lookups, telemetry).
 */
export interface SectionProps {
  /** The section definition being rendered. */
  section: SectionConfig;
  /** The resolved theme tokens for styling. */
  theme: ThemeTokens;
  /** The renderer context (route, page, resources, telemetry). */
  context: RendererContext;
}

/**
 * A section component. All registered components must conform to this
 * signature so the engine can render them uniformly.
 */
export type SectionComponent = React.ComponentType<SectionProps>;

/**
 * A telemetry sink for the renderer. Kept intentionally minimal and decoupled
 * from the AI pipeline telemetry so the renderer has no dependency on the AI
 * infrastructure. Implementations must never throw.
 */
export interface RendererTelemetry {
  /**
   * Records a renderer event. Implementations should be non-blocking and must
   * never throw (telemetry failures must not break rendering).
   */
  record(event: RendererTelemetryEvent): void;
}

/** A renderer telemetry event. */
export interface RendererTelemetryEvent {
  /** The event name. */
  type: string;
  /** A timestamp in ISO format. */
  timestamp: string;
  /** Optional extra context. */
  metadata?: Record<string, unknown>;
}

/** The canonical renderer telemetry event names. */
export const RendererTelemetryEventType = {
  /** An unknown section type was requested and fell back to GenericSection. */
  UNKNOWN_SECTION_TYPE: 'unknown_section_type',
  /** A page render started. */
  PAGE_RENDER_STARTED: 'page_render_started',
  /** A page render completed. */
  PAGE_RENDER_COMPLETED: 'page_render_completed',
  /** A section render started. */
  SECTION_RENDER_STARTED: 'section_render_started',
  /** A section render completed. */
  SECTION_RENDER_COMPLETED: 'section_render_completed',
  /** A route did not match any page. */
  ROUTE_NOT_FOUND: 'route_not_found',
} as const;


/** A no-op telemetry sink used when none is provided. */
export const noopRendererTelemetry: RendererTelemetry = {
  record(): void {
    // Intentionally empty.
  },
};

/**
 * The renderer context passed to every section component. Provides read-only
 * access to the current page, route, and indexed resource lookups.
 *
 * The context may optionally carry locale, tenant, and preview flags for
 * future i18n, multi-tenancy, and preview-mode support. These are reserved
 * fields — the engine does not yet act on them.
 */
export interface RendererContext {
  /** The current route being rendered. */
  route: string;
  /** The page being rendered. */
  page: PageConfig;
  /** The immutable ThemeConfig. */
  config: ThemeConfig;
  /** Indexed resource lookups (never Array.find). */
  resources: ResourceMap;
  /** The telemetry sink. */
  telemetry: RendererTelemetry;
  /** The active locale (e.g. "ko", "en"). Reserved for future i18n. */
  locale?: string;
  /** The active tenant identifier. Reserved for future multi-tenancy. */
  tenant?: string;
  /** Whether this is a preview render. Reserved for future preview mode. */
  preview?: boolean;
}


/**
 * An indexed, read-only map of resources keyed by ResourceId. Built once from
 * the ThemeConfig before rendering. All lookups (Pages -> Sections -> Assets)
 * MUST use this map — never Array.find().
 */
export interface ResourceMap {
  /** Pages keyed by id. */
  pages: ReadonlyMap<string, PageConfig>;
  /** Sections keyed by id. */
  sections: ReadonlyMap<string, SectionConfig>;
  /** Assets keyed by id. */
  assets: ReadonlyMap<string, AssetConfig>;
}

/**
 * Structured theme tokens derived from ThemeConfig.resources.settings.
 *
 * The ThemeProvider converts the raw settings into these typed tokens so
 * section components can style themselves consistently without reading raw
 * config values or branching on business semantics.
 */
export interface ThemeTokens {
  /** Color tokens. */
  colors: {
    /** The site's primary color. */
    primary: string;
    /** The site's secondary color. */
    secondary: string;
    /** The site's background color. */
    background: string;
    /** The site's text color. */
    text: string;
  };
  /** Spacing scale tokens. */
  spacing: {
    /** The base spacing unit. */
    base: string;
    /** Small spacing. */
    sm: string;
    /** Medium spacing. */
    md: string;
    /** Large spacing. */
    lg: string;
    /** Extra-large spacing. */
    xl: string;
  };
  /** Typography tokens. */
  typography: {
    /** The font family token. */
    font: string;
    /** The heading font family token. */
    headingFont: string;
  };
  /** Border radius tokens. */
  radius: {
    /** Small radius. */
    sm: string;
    /** Medium radius. */
    md: string;
    /** Large radius. */
    lg: string;
  };
  /** Shadow tokens. */
  shadows: {
    /** Small shadow. */
    sm: string;
    /** Medium shadow. */
    md: string;
    /** Large shadow. */
    lg: string;
  };
  /** Z-index tokens. */
  zIndex: {
    /** Base z-index. */
    base: number;
    /** Sticky/header z-index. */
    sticky: number;
    /** Overlay z-index. */
    overlay: number;
    /** Modal z-index. */
    modal: number;
  };
  /** Responsive breakpoint tokens. */
  breakpoints: {
    /** Small screens (e.g. "640px"). */
    sm: string;
    /** Medium screens (e.g. "768px"). */
    md: string;
    /** Large screens (e.g. "1024px"). */
    lg: string;
    /** Extra-large screens (e.g. "1280px"). */
    xl: string;
  };
  /** Animation tokens. */
  animation: {
    /** Short duration (e.g. "150ms"). */
    fast: string;
    /** Medium duration (e.g. "300ms"). */
    normal: string;
    /** Long duration (e.g. "500ms"). */
    slow: string;
    /** The default easing curve. */
    easing: string;
  };
  /** Motion preferences. */
  motion: {
    /** Whether reduced motion is preferred. */
    reduced: boolean;
  };
  /** The raw settings (read-only reference, never mutated). */
  raw: Readonly<ThemeConfig['resources']['settings']>;
}

/**
 * A pre-render hook.
 *
 * Runs before a page is rendered. Reserved for future i18n, A/B testing, and
 * analytics. The engine does not yet invoke these — the interface is reserved.
 */
export interface PreRenderHook {
  /** A stable identifier for the hook. */
  readonly id: string;
  /** Runs before rendering. May return a modified context. */
  beforeRender(context: RendererContext): RendererContext;
}

/**
 * A post-render hook.
 *
 * Runs after a page is rendered. Reserved for future analytics and
 * instrumentation. The engine does not yet invoke these — the interface is
 * reserved.
 */
export interface PostRenderHook {
  /** A stable identifier for the hook. */
  readonly id: string;
  /** Runs after rendering. */
  afterRender(context: RendererContext): void;
}

/**
 * A render middleware.
 *
 * Wraps the rendering of a page, allowing cross-cutting concerns (i18n, A/B
 * testing, analytics) to intercept the render pipeline. The engine does not
 * yet invoke these — the interface is reserved.
 */
export interface RenderMiddleware {
  /** A stable identifier for the middleware. */
  readonly id: string;
  /**
   * Wraps the render of a page. Receives the context and a `next` function
   * that continues the pipeline. Must call `next` to render.
   */
  render(context: RendererContext, next: (ctx: RendererContext) => React.ReactNode): React.ReactNode;
}


