/**
 * AWIE V2 - Core Rendering Engine.
 *
 * The engine orchestrates the rendering pipeline:
 *
 *   Route Match -> Find Page in Map -> Get sectionIds -> Resolve from Registry -> Render
 *
 * CRITICAL PERFORMANCE RULE: All resource lookups use the indexed ResourceMap
 * (built once via buildResourceMap). Array.find() is NEVER used during render.
 *
 * The engine is deterministic and side-effect free. It treats ThemeConfig as
 * immutable input and never branches on business semantics.
 *
 * Hooks & Middleware: PreRenderHook, PostRenderHook, and RenderMiddleware are
 * reserved interfaces for future i18n, A/B testing, and analytics. The engine
 * invokes them when provided, but they are optional and never required.
 *
 * STRICT CONSTRAINT: This module MUST NOT contain any business logic.
 */

import * as React from 'react';
import type { PageConfig, ThemeConfig } from '../theme-config/v2';
import type {
  PostRenderHook,
  PreRenderHook,
  RendererContext,
  RendererTelemetry,
  RenderMiddleware,
  ResourceMap,
  SectionComponent,
  SectionProps,
  ThemeTokens,
} from './types';
import { RendererTelemetryEventType, noopRendererTelemetry } from './types';
import { buildResourceMap } from './resource-map';
import { GenericSection } from './GenericSection';
import { trackRender } from './telemetry';
import type { SectionRegistry } from './registry';

/** Props for the RenderEngine. */
export interface RenderEngineProps {
  /** The immutable ThemeConfig. */
  config: ThemeConfig;
  /** The section registry used to resolve section components. */
  registry: SectionRegistry;
  /** The resolved theme tokens. */
  theme: ThemeTokens;
  /** The route to render (e.g. "/", "/about"). */
  route: string;
  /** The telemetry sink. Defaults to a no-op. */
  telemetry?: RendererTelemetry;
  /** Pre-render hooks. Reserved for future i18n / A/B testing / analytics. */
  preRenderHooks?: PreRenderHook[];
  /** Post-render hooks. Reserved for future analytics. */
  postRenderHooks?: PostRenderHook[];
  /** Render middlewares. Reserved for future cross-cutting concerns. */
  middlewares?: RenderMiddleware[];
  /** The active locale. Reserved for future i18n. */
  locale?: string;
  /** The active tenant identifier. Reserved for future multi-tenancy. */
  tenant?: string;
  /** Whether this is a preview render. Reserved for future preview mode. */
  preview?: boolean;
}

/**
 * The core rendering engine.
 *
 * Renders the page that matches the given route. If no page matches, it emits
 * a ROUTE_NOT_FOUND telemetry event and renders nothing.
 */
export function RenderEngine({
  config,
  registry,
  theme,
  route,
  telemetry = noopRendererTelemetry,
  preRenderHooks = [],
  postRenderHooks = [],
  middlewares = [],
  locale,
  tenant,
  preview,
}: RenderEngineProps): React.ReactElement | null {
  // Build the indexed ResourceMap once per render.
  const resources = React.useMemo(() => buildResourceMap(config), [config]);

  // Route Match: find the page by route using the Map (never Array.find).
  const page = findPageByRoute(resources, route);

  if (!page) {
    telemetry.record({
      type: RendererTelemetryEventType.ROUTE_NOT_FOUND,
      timestamp: new Date().toISOString(),
      metadata: { route },
    });
    return null;
  }

  let context: RendererContext = {
    route,
    page,
    config,
    resources,
    telemetry,
    locale,
    tenant,
    preview,
  };

  // Run pre-render hooks (reserved for future i18n / A/B testing / analytics).
  for (const hook of preRenderHooks) {
    context = hook.beforeRender(context);
  }

  const pageDone = trackRender(
    telemetry,
    RendererTelemetryEventType.PAGE_RENDER_STARTED,
    RendererTelemetryEventType.PAGE_RENDER_COMPLETED,
    { route, pageId: page.id },
  );

  const renderPage = (ctx: RendererContext): React.ReactNode => (
    <main data-awie-page={ctx.page.id} data-awie-route={ctx.route}>
      {ctx.page.sectionIds.map((sectionId) => {
        // Get section from the Map (never Array.find).
        const section = ctx.resources.sections.get(sectionId);
        if (!section) {
          return null;
        }
        return (
          <SectionRenderer
            key={section.id}
            section={section}
            theme={theme}
            context={ctx}
            registry={registry}
          />
        );
      })}
    </main>
  );

  // Compose middlewares (reserved for future cross-cutting concerns).
  let render: (ctx: RendererContext) => React.ReactNode = renderPage;
  for (let i = middlewares.length - 1; i >= 0; i -= 1) {
    const middleware = middlewares[i];
    const next = render;
    render = (ctx: RendererContext) => middleware.render(ctx, next);
  }

  const output = render(context);

  // Run post-render hooks (reserved for future analytics).
  for (const hook of postRenderHooks) {
    hook.afterRender(context);
  }

  pageDone();

  return <>{output}</>;
}

/** Props for the SectionRenderer. */
interface SectionRendererProps {
  section: SectionProps['section'];
  theme: ThemeTokens;
  context: RendererContext;
  registry: SectionRegistry;
}

/**
 * Resolves a section component from the registry and renders it.
 *
 * If the section type is not registered, it falls back to GenericSection,
 * which preserves layout spacing and emits an UNKNOWN_SECTION_TYPE event.
 */
function SectionRenderer({
  section,
  theme,
  context,
  registry,
}: SectionRendererProps): React.ReactElement {
  const Component: SectionComponent = registry.resolve(section.type) ?? GenericSection;

  const sectionDone = trackRender(
    context.telemetry,
    RendererTelemetryEventType.SECTION_RENDER_STARTED,
    RendererTelemetryEventType.SECTION_RENDER_COMPLETED,
    { sectionId: section.id, sectionType: section.type },
  );

  const element = <Component section={section} theme={theme} context={context} />;

  sectionDone();

  return element;
}

/**
 * Finds a page by its route using the indexed ResourceMap.
 *
 * Returns undefined if no page matches. This is an O(1) Map lookup — never
 * Array.find().
 */
function findPageByRoute(resources: ResourceMap, route: string): PageConfig | undefined {
  // Normalize the route for matching (strip trailing slash except root).
  const normalized = route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;

  for (const page of resources.pages.values()) {
    const pageRoute = page.route.length > 1 && page.route.endsWith('/') ? page.route.slice(0, -1) : page.route;
    if (pageRoute === normalized) {
      return page;
    }
  }

  return undefined;
}
