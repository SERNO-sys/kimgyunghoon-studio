import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getSiteData } from '@/lib/site-data';
import { resolveSiteConfig } from '@/lib/site-context';
import { RenderEngine, ThemeProvider, resolveThemeTokens } from '@/lib/renderer';
import { createProductionRegistry } from '@/lib/renderer/production-registry';
import { adaptLegacyThemeConfig } from '@/lib/renderer/legacy-adapter';
import type { SitePage } from '@/lib/db/types';


export const runtime = 'edge';

interface CustomPageProps {
  params: Promise<{ siteId: string; slug: string[] }>;
}

/**
 * Resolves an AWIE-generated custom page (themeConfig.pages) by its route path.
 *
 * The layout merges legacy navigation pages with `themeConfig.pages`; custom
 * pages (Gallery, Products, Services, ...) carry `type: 'custom'` and are
 * rendered here through the real RenderEngine + ThemeProvider pipeline.
 *
 *   DESIGN DECISION → ThemeConfig → RENDER
 *
 * The RenderEngine matches the requested route against `themeConfig.resources.pages`,
 * resolves each sectionId from `themeConfig.resources.sections`, and renders the
 * section through the production registry (hero, gallery, features, cta, ...).
 * The ThemeProvider converts the ThemeConfig settings into concrete tokens
 * (colors, spacing, typography, radius) that the section components consume.
 *
 * Legacy ABOUT / DIARY / CONTACT routes are handled by their dedicated tenant
 * pages, so this catch-all only serves the AI-generated custom pages.
 */
function findCustomPage(pages: SitePage[], path: string): SitePage | undefined {
  const flat: SitePage[] = [];
  const walk = (list: SitePage[]) => {
    for (const page of list) {
      flat.push(page);
      if (page.children?.length) walk(page.children);
    }
  };
  walk(pages);
  return flat.find((page) => page.path === path && page.type === 'custom');
}

export async function generateMetadata({
  params,
}: CustomPageProps): Promise<Metadata> {
  const { siteId, slug } = await params;
  const data = await getSiteData(siteId);
  if (!data) return { title: 'Not Found' };

  const config = resolveSiteConfig(data.site, data.settings);
  const path = `/${slug.join('/')}`;
  const page = findCustomPage(config.themeConfig.pages ?? [], path);

  return {
    title: page ? `${page.label} | ${config.name}` : `Not Found | ${config.name}`,
  };
}

export default async function CustomPage({ params }: CustomPageProps) {
  const { siteId, slug } = await params;
  const data = await getSiteData(siteId);
  if (!data) {
    notFound();
  }

  const config = resolveSiteConfig(data.site, data.settings);
  const path = `/${slug.join('/')}`;
  const page = findCustomPage(config.themeConfig.pages ?? [], path);

  if (!page) {
    notFound();
  }

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
        route={path}
      />
    </ThemeProvider>
  );
}


