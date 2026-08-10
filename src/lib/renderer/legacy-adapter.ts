/**
 * AWIE V2 — Legacy ThemeConfig Adapter.
 *
 * The site's persisted `themeConfig` uses the legacy shape (src/types/site):
 * a flat `sections: string[]` list plus a small `content` record. The Renderer
 * (RenderEngine + ThemeProvider + production registry) consumes the v2 shape
 * (src/lib/theme-config/v2): a full ThemeConfig with `metadata`, `resources`
 * (pages, sections, settings, menus), and `policies`.
 *
 * This module is the MINIMAL adapter that converts the legacy shape into the
 * v2 shape the Renderer understands. It is a pure, deterministic data mapper —
 * it makes NO design decisions and contains NO business logic. It only lifts
 * the existing persisted values into the renderer-facing contract.
 *
 *   DESIGN DECISION → ThemeConfig (v2) → RENDER
 *
 * STRICT CONSTRAINT: This module MUST NOT contain business logic. It maps data
 * shapes only.
 */

import type { ThemeConfig as LegacyThemeConfig } from '@/types/site';
import type { SitePage } from '@/lib/db/types';
import type {
  PageConfig,
  SectionConfig,
  ThemeConfig,
  ThemeResources,
} from '../theme-config/v2/types';

/** The default menu that is ALWAYS preserved. */
const DEFAULT_MENU = [
  { label: 'HOME', target: '/' },
  { label: 'ABOUT', target: '/about' },
  { label: 'DIARY', target: '/diary' },
  { label: 'CONTACT', target: '/contact' },
];

/** A small string reader with a fallback. */
function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/**
 * Maps a legacy section type string to a v2 SectionType.
 *
 * Unknown types fall back to 'text' so the renderer never white-screens.
 */
function toSectionType(type: string): SectionConfig['type'] {
  switch (type) {
    case 'hero':
    case 'text':
    case 'image':
    case 'gallery':
    case 'features':
    case 'testimonials':
    case 'cta':
    case 'contact':
    case 'footer':
    case 'custom':
      return type;
    default:
      return 'text';
  }
}

/**
 * Builds the v2 section content from the legacy themeConfig content + the
 * section type. Each section gets its OWN copy so the AI's hero text is never
 * copy-pasted into unrelated sections.
 */
function buildSectionContent(
  type: string,
  legacy: LegacyThemeConfig | undefined,
): Record<string, unknown> {
  const content = legacy?.content;
  const heroTitle = str(content?.hero_title, '환영합니다');
  const heroSubtitle = str(content?.hero_subtitle, '');
  const aboutBio = str(content?.about_bio, '');

  switch (type) {
    case 'hero':
      return {
        title: heroTitle,
        subtitle: heroSubtitle,
        body: heroSubtitle,
        ctaLabel: '문의하기',
        ctaHref: '/contact',
        imageUrl: '/banner.jpg',
      };
    case 'about':
      return { title: 'About', body: aboutBio || heroSubtitle };
    case 'gallery':
      return { title: 'Gallery', items: [] };
    case 'features':
      return { title: 'Services', items: [] };
    case 'testimonials':
      return { title: '고객 이야기', items: [] };
    case 'cta':
      return { title: '지금 시작하세요', body: heroSubtitle, ctaLabel: '문의하기', ctaHref: '/contact' };
    case 'contact':
      return { title: 'Contact', body: '문의는 아래로 부탁드립니다.' };
    case 'footer':
      return { title: heroTitle, body: '' };
    default:
      return { title: type, body: heroSubtitle };
  }
}

/**
 * Maps a legacy SitePage to a v2 PageConfig.
 *
 * The legacy page's `path` becomes the v2 `route`. The page's section is
 * derived from its `type` (gallery → gallery, services → features, etc.).
 */
function toPageConfig(page: SitePage): PageConfig {
  const sectionType = page.type === 'custom' ? 'text' : page.type;
  return {
    id: page.id,
    route: page.path,
    title: page.label,
    sectionIds: [sectionType],
    hidden: page.visible === false,
  };
}

/**
 * Converts a legacy ThemeConfig into the v2 ThemeConfig the Renderer consumes.
 *
 * The input is never mutated. A new v2-shaped object is returned. All values
 * are lifted from the existing persisted data; nothing is invented.
 */
export function adaptLegacyThemeConfig(
  legacy: LegacyThemeConfig | undefined,
  siteName: string,
  pages: SitePage[],
): ThemeConfig {
  // The persisted site config is a HYBRID: the autobuild route casts the v2
  // ThemeConfig into the legacy shape, so the same object carries BOTH the
  // legacy fields (sections[], content, pages) AND the v2 fields (resources.*).
  //
  // When the v2 `resources` are already present, they are the single source of
  // truth — they carry the Design Intelligence decisions (hero variant, section
  // order, section variants, palette, typography, menus, pages). We lift them
  // directly instead of rebuilding from the legacy shape, so the AI's design
  // intent actually reaches the renderer.
  const v2 = (legacy as unknown as { resources?: ThemeResources }).resources;
  if (v2) {
    return {
      metadata: {
        title: siteName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generator: 'awie-legacy-adapter',
        generatorVersion: '1.0.0',
      },
      intent: legacy?.intentType,
      resources: v2,
      policies: {},
    };
  }

  // Legacy-only fallback: no v2 resources present. Rebuild the v2 shape from
  // the legacy fields. This path is used by sites created before the AWIE V2
  // pipeline and never white-screens.
  const sections = legacy?.sections?.length ? legacy.sections : ['hero', 'about', 'contact'];

  const sectionConfigs: SectionConfig[] = sections.map((type, index) => ({
    id: `section-${type}-${index}`,
    type: toSectionType(type),
    content: buildSectionContent(type, legacy),
    settings: {
      variant: type === 'hero' ? 'CENTERED' : undefined,
    },
  }));


  // Build the page list: the legacy navigation pages (HOME/ABOUT/DIARY/CONTACT
  // + any custom pages) become v2 PageConfigs. Each page references its section.
  const pageConfigs: PageConfig[] = pages.map(toPageConfig);

  // Ensure a home page exists.
  if (!pageConfigs.some((page) => page.route === '/')) {
    pageConfigs.unshift({
      id: 'home',
      route: '/',
      title: 'HOME',
      sectionIds: ['hero'],
      isHome: true,
    });
  }

  const resources: ThemeResources = {
    pages: pageConfigs,
    sections: sectionConfigs,
    assets: [],
    settings: {
      primaryColor: undefined,
      secondaryColor: undefined,
      backgroundColor: undefined,
      textColor: undefined,
      skin: {
        colorPalette: legacy?.presetId ?? 'default',
        fontPairing: legacy?.fontPairing ?? 'default',
      },
      skeleton: {
        headerType: 'default',
        heroType: 'CENTERED',
      },
    },
    menus: [
      {
        id: 'main',
        label: 'Main',
        items: DEFAULT_MENU.map((item) => ({ ...item })),
      },
    ],
    forms: [],
  };

  return {
    metadata: {
      title: siteName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generator: 'awie-legacy-adapter',
      generatorVersion: '1.0.0',
    },
    intent: legacy?.intentType,
    resources,
    policies: {},
  };
}
