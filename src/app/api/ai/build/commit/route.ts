import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import {
  createDomain,
  createPost,
  createSite,
  createUser,
  getSiteByDomain,
  getUserById,
  upsertSettings,
} from '@/lib/db/queries';
import { getDefaultPages } from '@/lib/site-context';
import type { ThemeConfig as V2ThemeConfig } from '@/lib/theme-config/v2/types';
import type { ThemeConfig as LegacyThemeConfig } from '@/types/site';
import type { ThemeResources } from '@/lib/theme-config/v2/types';
import type { Site, SiteSettings, User, Post, SitePage } from '@/lib/db/types';


export const runtime = 'edge';

/**
 * AWIE V2 - Phase 20.1: Commit Route.
 *
 * The critical bridge that persists a planned (v2) ThemeConfig into a real
 * Site. The AI Build Wizard produces an immutable v2 ThemeConfig via
 * /api/ai/build/plan; this route turns that config into a Site row (site +
 * domain + settings + pages + welcome post) so the user can Preview and Publish.
 *
 * ARCHITECTURAL BOUNDARY:
 *   - This is a thin WRAPPER (Buy Before Build). It reuses the existing
 *     createSite / createDomain / upsertSettings / createPost queries and the
 *     existing legacy renderer. It does NOT re-run the AI and does NOT touch
 *     Core.
 *   - The v2 ThemeConfig is the immutable SSOT. This route only READS it and
 *     maps it into the legacy ThemeConfig shape the existing renderer consumes.
 *   - It NEVER mutates the incoming config.
 */

/** Maps a v2 ThemeConfig into the legacy ThemeConfig shape the renderer reads. */
function toLegacyThemeConfig(v2: V2ThemeConfig): LegacyThemeConfig {
  const settings = v2.resources?.settings ?? {};
  const skin = settings.skin;
  const skeleton = settings.skeleton;
  const report = settings.aiDesignReport;

  // Ordered homepage sections from the v2 config. The legacy renderer iterates
  // `themeConfig.sections` to build the one-page layout.
  const homePage = v2.resources?.pages?.find((p) => p.isHome || p.route === '/');
  const sections = (homePage?.sectionIds ?? []).filter(
    (id) => typeof id === 'string' && id.trim().length > 0
  );

  // AI-written copy from the v2 config's hero/text sections.
  const heroSection = v2.resources?.sections?.find((s) => s.type === 'hero');
  const heroContent = (heroSection?.content ?? {}) as Record<string, unknown>;
  const aboutSection = v2.resources?.sections?.find((s) => s.type === 'text');
  const aboutContent = (aboutSection?.content ?? {}) as Record<string, unknown>;

  const legacy: LegacyThemeConfig = {
    presetId: 'default',
    intentType: v2.intent,
    skin: skin
      ? {
          color_palette: (skin.colorPalette as LegacyThemeConfig['skin'] extends infer S
            ? S extends { color_palette: infer C }
              ? C
              : never
            : never) ?? 'warm',
          font_pairing: (skin.fontPairing as LegacyThemeConfig['skin'] extends infer S
            ? S extends { font_pairing: infer F }
              ? F
              : never
            : never) ?? 'sans',
        }
      : undefined,
    skeleton: skeleton
      ? {
          header_type: (skeleton.headerType as LegacyThemeConfig['skeleton'] extends infer S
            ? S extends { header_type: infer H }
              ? H
              : never
            : never) ?? 'logo-left',
          hero_type: (skeleton.heroType as LegacyThemeConfig['skeleton'] extends infer S
            ? S extends { hero_type: infer H }
              ? H
              : never
            : never) ?? 'cover',
        }
      : undefined,
    aiDesignReport: report
      ? {
          analyzed_industry: report.analyzedIndustry ?? '',
          reasoning: report.reasoning ?? '',
        }
      : undefined,
    sections: sections.length > 0 ? sections : ['hero', 'about', 'contact'],
    content: {
      hero_title: String(heroContent.title ?? heroContent.heading ?? v2.metadata.title ?? ''),
      hero_subtitle: String(heroContent.subtitle ?? heroContent.tagline ?? v2.metadata.tagline ?? ''),
      about_bio: String(aboutContent.body ?? aboutContent.text ?? v2.metadata.description ?? ''),
    },
  };

  // CRITICAL: Preserve the v2 `resources` object on the persisted legacy config.
  //
  // The legacy renderer adapter (src/lib/renderer/legacy-adapter.ts) reads
  // `(legacy as { resources?: ThemeResources }).resources` and, when present,
  // treats it as the single source of truth — lifting the Design Intelligence
  // decisions (hero variant, section variants, image treatment, CTA priority,
  // palette, typography, menus, pages) directly to the renderer.
  //
  // Without this, the commit path drops `resources` and every generated site
  // falls back to a CENTERED hero with no section variants — the Design
  // Intelligence output never reaches the renderer. The legacy fields above
  // continue to work exactly as before; `resources` is additive.
  const legacyWithResources = legacy as LegacyThemeConfig & { resources?: ThemeResources };
  legacyWithResources.resources = v2.resources;

  return legacyWithResources;
}


/**
 * Maps v2 pages into the legacy SitePage navigation shape.
 *
 * STEP 15-E — Preserve the legacy navigation while connecting AWIE output.
 *
 * The legacy V2.6 navigation is HOME / DIARY / ABOUT / CONTACT. AWIE's
 * `resources.pages` frequently contains only a HOME entry (Gallery/Products
 * live in `resources.sections`), so replacing the defaults with
 * `resources.pages` would drop the core menu and leave the header with only a
 * HOME link. Instead we START from the legacy defaults and APPEND AWIE
 * pages/menu entries whose path is not already present. This preserves
 * HOME/DIARY/ABOUT/CONTACT and surfaces AWIE-generated entries (Gallery,
 * Products, etc.) as real navigation items.
 */
function toSitePages(v2: V2ThemeConfig, siteName: string): SitePage[] {
  const v2Pages = v2.resources?.pages ?? [];

  const typeByRoute: Record<string, SitePage['type']> = {
    '/': 'home',
    '/diary': 'diary',
    '/about': 'about',
    '/contact': 'contact',
  };

  // Start from the legacy defaults so the core HOME/DIARY/ABOUT/CONTACT menu
  // is always preserved, then append AWIE pages whose path is not already used.
  const generatedPages: SitePage[] = getDefaultPages(siteName);
  const seenPaths = new Set(generatedPages.map((p) => p.path));

  for (const page of v2Pages) {
    const path = page.route || '/';
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);

    const type = typeByRoute[path] ?? 'custom';
    const label = page.title || path.replace(/^\//, '') || 'New Page';
    generatedPages.push({
      id: page.id || crypto.randomUUID(),
      label: label.toUpperCase(),
      path,
      type,
      visible: !page.hidden,
      order: generatedPages.length,
      content: page.description ?? '',
    });
  }

  return generatedPages;
}


export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { config, siteName } = body as {
      config?: V2ThemeConfig;
      siteName?: string;
    };

    if (!config || typeof config !== 'object' || !config.metadata) {
      return NextResponse.json(
        { success: false, message: 'A planned ThemeConfig is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    const existingUser = await getUserById(db, session.userId);
    if (!existingUser) {
      const user: User = {
        id: session.userId,
        email: session.email,
        name: session.name,
        picture: session.picture,
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createUser(db, user);
    }

    const siteId = crypto.randomUUID();
    const subdomain = siteId.split('-')[0] || siteId;

    const hostname = new URL(request.url).hostname;
    const defaultDomain =
      hostname === 'localhost' ? `${subdomain}.localhost` : `${subdomain}.${hostname}`;

    if (await getSiteByDomain(db, defaultDomain)) {
      return NextResponse.json(
        { success: false, message: 'Site domain already exists' },
        { status: 409 }
      );
    }

    const name = (siteName || config.metadata.title || 'My Site').trim().slice(0, 50);
    const description = config.metadata.description ?? '';

    // Map the immutable v2 SSOT into the legacy shape the renderer consumes.
    const themeConfig = toLegacyThemeConfig(config);
    const generatedPages = toSitePages(config, name);
    themeConfig.pages = generatedPages;

    const site: Site = {
      id: siteId,
      ownerId: session.userId,
      name,
      description,
      language: 'ko',
      timezone: 'Asia/Seoul',
      theme: 'default',
      themeConfig,
      maintenance: false,
      isPublished: false,
      deployVersion: '',
      revision: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    await createSite(db, site);

    await createDomain(db, {
      id: crypto.randomUUID(),
      siteId,
      domain: defaultDomain,
      verified: true,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const settings: SiteSettings = {
      id: siteId,
      siteId,
      general: JSON.stringify({
        name,
        description,
        language: 'ko',
        timezone: 'Asia/Seoul',
        maintenance: false,
        hero_title: themeConfig.content?.hero_title ?? name,
        hero_subtitle: themeConfig.content?.hero_subtitle ?? '',
        about_text: themeConfig.content?.about_bio ?? '',
        profile_image: '',
      }),
      contact: JSON.stringify({ email: session.email, phone: '' }),
      analytics: '{}',
      social: JSON.stringify({}),
      pages: JSON.stringify(generatedPages),
      updatedAt: new Date().toISOString(),
    };
    await upsertSettings(db, settings);

    const welcomePost: Post = {
      id: crypto.randomUUID(),
      siteId,
      title: `Welcome to ${site.name}`,
      slug: 'welcome',
      category: 'Notice',
      tags: '',
      content: `# Welcome to ${site.name}\n\n${site.description}`,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await createPost(db, welcomePost);

    return NextResponse.json({
      success: true,
      siteId,
      domain: defaultDomain,
    });
  } catch (error) {
    console.error('DB Error (build/commit):', error);
    const message = error instanceof Error ? error.message : 'Failed to create site';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
