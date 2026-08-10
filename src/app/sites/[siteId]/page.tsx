import type { Metadata } from 'next';

import { getSiteData } from '@/lib/site-data';
import { resolveSiteConfig } from '@/lib/site-context';
import { RenderEngine, ThemeProvider, resolveThemeTokens } from '@/lib/renderer';
import { createProductionRegistry } from '@/lib/renderer/production-registry';
import { adaptLegacyThemeConfig } from '@/lib/renderer/legacy-adapter';

export const runtime = 'edge';

interface SitePageProps {
  params: Promise<{ siteId: string }>;
}

/**
 * AWIE V2 — Home page renderer.
 *
 * The home page is rendered through the SAME pipeline as every custom page:
 *
 *   DESIGN DECISION → ThemeConfig → RENDER
 *
 * The persisted ThemeConfig (which carries the Design Intelligence decisions:
 * hero variant, section order, section variants, AI copy, palette, typography,
 * spacing) is lifted into the v2 shape by the legacy adapter, then consumed by
 * the RenderEngine + ThemeProvider + production registry.
 *
 * The RenderEngine matches the home route "/" against `themeConfig.resources.pages`,
 * resolves each sectionId from `themeConfig.resources.sections`, and renders the
 * section through the production registry (hero, gallery, features, cta, ...).
 * The ThemeProvider converts the ThemeConfig settings into concrete tokens
 * (colors, spacing, typography, radius) that the section components consume.
 *
 * The Renderer NEVER judges. It consumes the ThemeConfig. The Design
 * Intelligence decisions (which hero variant, which section order, which
 * section variants) are already baked into the persisted ThemeConfig.
 */
export default async function SitePage({ params }: SitePageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) return null;

  const config = resolveSiteConfig(data.site, data.settings);

  // The site's persisted themeConfig uses the legacy shape. The adapter lifts
  // it into the v2 ThemeConfig the Renderer consumes (metadata, resources,
  // policies). It makes no design decisions — it only maps existing values.
  const themeConfig = adaptLegacyThemeConfig(
    config.themeConfig,
    config.name,
    config.themeConfig.pages ?? [],
  );

  // The production registry maps ThemeConfig section types to real, visible
  // React components. It is created once per render.
  const registry = createProductionRegistry();

  return (
    <ThemeProvider config={themeConfig}>
      <RenderEngine
        config={themeConfig}
        registry={registry}
        theme={resolveThemeTokens(themeConfig)}
        route="/"
      />
    </ThemeProvider>
  );
}
