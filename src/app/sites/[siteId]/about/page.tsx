import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getSiteData } from '@/lib/site-data';
import { resolveSiteConfig } from '@/lib/site-context';
import { RenderEngine, ThemeProvider } from '@/lib/renderer';
import { resolveThemeTokens } from '@/lib/renderer/theme-tokens';
import { adaptLegacyThemeConfig } from '@/lib/renderer/legacy-adapter';

export const runtime = 'edge';

interface AboutPageProps {
  params: Promise<{ siteId: string }>;
}

/**
 * AWIE V2 — About page renderer.
 *
 * The about page is rendered through the SAME pipeline as every other page:
 *
 *   DESIGN DECISION → ThemeConfig → RENDER
 *
 * The persisted ThemeConfig (which carries the Design Intelligence decisions:
 * about copy, section order, section variants, palette, typography, spacing) is
 * lifted into the v2 shape by the legacy adapter, then consumed by the
 * RenderEngine + ThemeProvider + production registry.
 *
 * The RenderEngine matches the "/about" route against
 * `themeConfig.resources.pages`, resolves each sectionId from
 * `themeConfig.resources.sections`, and renders the section through the
 * production registry (about → TextSection, team → FeaturesSection,
 * services → FeaturesSection, ...).
 *
 * The Renderer NEVER judges. It consumes the ThemeConfig. The Design
 * Intelligence decisions (which about variant, which section order, which
 * section variants) are already baked into the persisted ThemeConfig.
 */
export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) return { title: 'Not Found' };

  const config = resolveSiteConfig(data.site, data.settings);
  return { title: `About | ${config.name}` };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) {
    notFound();
  }

  const config = resolveSiteConfig(data.site, data.settings);

  // The site's persisted themeConfig uses the legacy shape. The adapter lifts
  // it into the v2 ThemeConfig the Renderer consumes (metadata, resources,
  // policies). It makes no design decisions — it only maps existing values.
  const themeConfig = adaptLegacyThemeConfig(
    config.themeConfig,
    config.name,
    config.themeConfig.pages ?? [],
  );

  return (
    <ThemeProvider config={themeConfig}>
      <RenderEngine
        config={themeConfig}
        theme={resolveThemeTokens(themeConfig)}
        route="/about"
      />
    </ThemeProvider>
  );
}
