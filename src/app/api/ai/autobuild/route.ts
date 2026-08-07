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
import { generateText } from '@/lib/ai/client';
import { parseJsonResponse } from '@/lib/ai/engine';
import { parseAwieDecision, toThemeConfigDecision } from '@/lib/ai/awie-schema';
import { getCurrentUserTier, TIER_LIMITS } from '@/lib/config/tiers';
import { getDefaultPages } from '@/lib/site-context';
import { PRESETS } from '@/constants/presets';
import type { ThemeConfig, ThemePresetId } from '@/types/site';
import type { Site, SiteSettings, User, Post, SitePage } from '@/lib/db/types';



export const runtime = 'edge';

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
    const { prompt } = body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, message: 'Prompt is required' },
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

    // The tenant subdomain is the first segment of the site UUID (e.g.
    // `e801f11c` for `e801f11c-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), so the canonical
    // public URL is `https://e801f11c.lucidworker.com`.
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

    const trimmed = prompt.trim();
    const userTier = getCurrentUserTier();
    const maxMenus = TIER_LIMITS[userTier].MAX_MENUS;
    const extraPages = Math.max(0, maxMenus - 4);
    const autobuildJson = await generateText(
      'autobuild',
      JSON.stringify({ concept: trimmed, extraPages })
    );

    // Sanitize + parse via the unified AI Engine parser (one sanitizer for
    // every structured flow). If the AI produced no parseable JSON object,
    // fall back to an empty object — the rest of the handler defaults every
    // field, so a site is still created with sensible placeholder content.
    const parsedJson = parseJsonResponse(autobuildJson);
    const parsed: Record<string, unknown> =
      parsedJson !== null && typeof parsedJson === 'object' && !Array.isArray(parsedJson)
        ? (parsedJson as Record<string, unknown>)
        : {};
    if (parsedJson === null) {
      console.error('[autobuild] AI returned invalid JSON, using fallback:', {
        raw: autobuildJson.slice(0, 500),
      });
    }


    const title = String(parsed.title || '');
    const name = title.trim().slice(0, 50) || 'My Site';
    const description = String(parsed.description || '');
    const homeHeroTitle = String(parsed.home_hero_title || name);
    const homeHeroSubtitle = String(parsed.home_hero_subtitle || '');
    const homePhilosophyText = String(parsed.home_philosophy_text || '');
    const aboutSubHeading = String(parsed.about_subheading || '');
    const aboutText = String(parsed.about_text || '');
    const aboutPhilosophyHeading = String(parsed.about_philosophy_heading || 'Philosophy');
    const aboutPhilosophy = String(parsed.about_philosophy || '');
    const diarySubheading = String(parsed.diary_subheading || '');
    const contactSubheading = String(parsed.contact_subheading || '');
    const customPageIntros = (parsed.custom_page_intros || {}) as Record<string, string>;

    // V2 Theme System - Phase 3: curate a preset from the AI response.
    // The AI returns a `themeConfig.presetId` string. Validate it against the
    // known preset registry and fall back to 'default' if it is missing or
    // invalid, so a bad AI response never breaks site creation.
    const rawThemeConfig = (parsed.themeConfig || {}) as Record<string, unknown>;
    const rawPresetId = String(rawThemeConfig.presetId || '');
    const presetId: ThemePresetId = PRESETS[rawPresetId as ThemePresetId]
      ? (rawPresetId as ThemePresetId)
      : 'default';

    // AWIE Decision Engine (V2): validate the AI's intent/skin/skeleton/report
    // against the strict Zod schema. If the AI returns out-of-spec values, we
    // fall back to a preset-only config so site creation never breaks.
    const awieDecision = parseAwieDecision(parsed);
    const themeConfig: ThemeConfig = awieDecision
      ? {
          presetId,
          ...toThemeConfigDecision(awieDecision),
        }
      : { presetId };

    // AWIE Content (V2): persist the AI-written copy on the theme config so the
    // modular frontend renderer can display it. If the AI did not return a
    // `content` object (or it failed validation), fall back to the per-page
    // copy fields so the site still has real text.
    if (!themeConfig.content) {
      themeConfig.content = {
        hero_title: String(parsed.home_hero_title || name),
        hero_subtitle: String(parsed.home_hero_subtitle || ''),
        about_bio: String(parsed.about_text || ''),
      };
    }


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

    const pageContentByPath: Record<string, string> = {
      '/diary': diarySubheading,
      '/about': aboutPhilosophyHeading,
      '/contact': contactSubheading,
      ...customPageIntros,
    };

    let generatedPages: SitePage[] = getDefaultPages(name);
    const rawMenu = Array.isArray(parsed.menu) ? parsed.menu : [];
    const basePages = rawMenu.filter((item: unknown) =>
      ['home', 'diary', 'about', 'contact'].includes(
        (item as { type?: string }).type || ''
      )
    );
    const customPages = rawMenu.filter(
      (item: unknown) => (item as { type?: string }).type === 'custom'
    );
    const menu = [...basePages, ...customPages.slice(0, extraPages)];
    if (menu.length > 0) {
      generatedPages = menu.map((item: unknown, index: number) => {
        const page = item as { label?: string; path?: string; type?: string };
        const type = ['home', 'music', 'diary', 'about', 'contact', 'custom'].includes(page.type || '')
          ? (page.type as SitePage['type'])
          : 'custom';
        const path = page.path || '/';
        const baseContent: Record<string, string> = {
          home: '',
          diary: diarySubheading,
          about: aboutPhilosophyHeading,
          contact: contactSubheading,
        };
        const baseLabel: Record<string, string> = {
          home: 'HOME',
          diary: 'DIARY',
          about: 'ABOUT',
          contact: 'CONTACT',
        };
        const label = baseLabel[type] || page.label || 'New Page';
        // Custom pages must always carry a non-empty body so the catch-all
        // route renders something instead of a blank page. If the AI did not
        // provide an intro for this path, fall back to a short default blurb.
        const content =
          pageContentByPath[path] ||
          baseContent[type] ||
          (type === 'custom'
            ? `${label} 페이지입니다. 이곳에 내용을 채워 넣으세요.`
            : '');
        return {
          id: crypto.randomUUID(),
          label,
          path,
          type,
          visible: true,
          order: index,
          content,
        };

      });
    }

    // AWIE Pages (V2): persist the AI-generated navigation on the theme config
    // so the tenant header renders these dynamic menu items (Home, Portfolio,
    // etc.) instead of the hardcoded DIARY/ABOUT/CONTACT set.
    themeConfig.pages = generatedPages;

    // AWIE Sections (V2): persist the ordered homepage section list the AI
    // chose (e.g. ["hero", "about", "gallery", "contact"]). The tenant
    // renderer iterates this array to build the one-page (SPA) layout, so
    // without it the site falls back to the default hero/about/contact set.
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const validSections = rawSections.filter(
      (s: unknown) => typeof s === 'string' && s.trim().length > 0
    ) as string[];
    if (validSections.length > 0) {
      themeConfig.sections = validSections;
    }


    const settings: SiteSettings = {
      id: siteId,
      siteId,
      general: JSON.stringify({

        name,
        description,
        language: 'ko',
        timezone: 'Asia/Seoul',
        maintenance: false,
        hero_title: homeHeroTitle,
        hero_subtitle: homeHeroSubtitle,
        philosophy_text: homePhilosophyText,
        about_sub_heading: aboutSubHeading,
        about_text: aboutText,
        about_philosophy: aboutPhilosophy,
        profile_image: '',
      }),
      contact: JSON.stringify({
        email: session.email,
        phone: '',
      }),
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
    });
  } catch (error) {
    // Log the real error (e.g. the underlying SQLITE_ERROR) so it is visible in
    // the server logs instead of being swallowed by a generic 500 response.
    console.error('DB Error (autobuild):', error);
    const message = error instanceof Error ? error.message : 'Failed to build site';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

