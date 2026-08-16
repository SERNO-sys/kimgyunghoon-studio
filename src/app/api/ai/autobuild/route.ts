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
import { getCurrentUserTier, TIER_LIMITS } from '@/lib/config/tiers';
import { getDefaultPages } from '@/lib/site-context';
import { BrainGoldenPath } from '@/lib/golden-path/brain-pipeline';
import { GeminiCopywriterProvider } from '@/lib/brain/copywriter';
import { RecipeMerger } from '@/lib/recipe-engine';
import { EnrichmentService } from '@/lib/enrichment';
import type { ThemeConfig } from '@/types/site';
import type { Site, SiteSettings, User, Post, SitePage } from '@/lib/db/types';
import type { ThemeConfig as V2ThemeConfig } from '@/lib/theme-config/v2/types';


/**
 * STEP 15-C — Minimum V2.6 Renderer Adapter.
 *
 * The RecipeMerger produces a ThemeConfig v2 (data lives under `metadata.*`
 * and `resources.*`), but the existing V2.6 Renderer consumes the legacy
 * ThemeConfig shape (`@/types/site`): `content`, `pages`, and a flat `sections`
 * array. This adapter performs the ONLY explicit, typed conversion between the
 * two schemas. It maps already-generated values deterministically — it never
 * invents copy, never generates new content, and never reinterprets the user's
 * business.
 */
function toLegacyThemeConfig(
  v2: V2ThemeConfig,
  derived: {
    heroTitle: string;
    heroSubtitle: string;
    aboutBio: string;
    pages: SitePage[];
  }
): ThemeConfig {
  // The v2 config carries no legacy preset fields; the legacy renderer falls
  // back to DEFAULT_PRESET for those. We only surface the fields the renderer
  // actually reads from the persisted config.
  const legacy: ThemeConfig = v2 as unknown as ThemeConfig;

  // A. Populate the legacy `pages` field from the already-generated pages
  //    (derived from v2.resources.pages). The tenant layout reads
  //    `config.themeConfig.pages`, not `settings.pages`.
  if (derived.pages.length > 0) {
    legacy.pages = derived.pages;
  }

  // B. Populate the legacy `content` fields from the already-generated
  //    metadata (title/tagline/description). The tenant renderer reads
  //    `themeConfig.content.hero_title/hero_subtitle/about_bio`.
  legacy.content = {
    hero_title: derived.heroTitle,
    hero_subtitle: derived.heroSubtitle,
    about_bio: derived.aboutBio,
  };

  // C. The flat `sections` array is populated by the caller after the v2
  //    section ids are derived (kept here for symmetry with the existing flow).

  return legacy;
}





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

    // AWIE V2 Brain — Step 14 Golden Path.
    //
    // The first operation on the raw prompt is ALWAYS extractSingleShotBrief()
    // (inside the orchestrator). The Brain semantic decision pipeline, Recipe
    // Integration, ContentPlan, AI #2, Fact Validator, and ThemeConfig Bridge
    // run in the frozen order. The orchestrator produces a V2.6-compatible
    // MergeInput, which the existing V2.6 RecipeMerger consumes to produce the
    // final ThemeConfig.
    //
    // There is NO legacy AI decision path here. If the Golden Path fails, we
    // return a structured failure — we never silently fall back to the old
    // direct-LLM autobuild decision engine.
    //
    // AI #2 (copywriter) is injected at the composition root. The Gemini
    // provider uses the existing getAiEngine()/generateStructured() infra and
    // transparently falls back to the deterministic mock when GEMINI_API_KEY is
    // not configured, so the pipeline stays deterministic in tests and local
    // dev while using real Gemini in production.
    const goldenPath = new BrainGoldenPath(new GeminiCopywriterProvider());
    const pipeline = await goldenPath.run(trimmed);
    if (!pipeline.ok) {
      return NextResponse.json(
        { success: false, message: `Golden Path failed: ${pipeline.error.code} — ${pipeline.error.message}` },
        { status: 422 }
      );
    }

    // V2.6 execution boundary: the orchestrator feeds the validated MergeInput
    // to the existing RecipeMerger, then applies Design Intelligence (HOW).
    //
    // Design Intelligence consumes the Brain outputs (BusinessMeaning,
    // DecisionPlan, ContentPlan) and produces a VisualDesignDecision (hero
    // variant, section order, section variants, archetype, palette, typography,
    // spacing, CTA priority, image treatment). The ThemeConfig Bridge writes
    // that decision into the renderer-facing ThemeConfig.
    //
    // This is the ONLY place the Design Intelligence decisions are materialized
    // into the persisted ThemeConfig. Without it, the site would render only the
    // RecipeMerger's default sections and never reflect the AI's design intent.
    const mergeResult = goldenPath.execute(pipeline);
    const v2Config = mergeResult.config;


    // Derive the site metadata from the V2.6 ThemeConfig (the single source of
    // truth produced by the Golden Path). The DB persists this config as JSON.
    const name = (v2Config.metadata?.title || '').trim().slice(0, 50) || 'My Site';
    const description = v2Config.metadata?.description || '';
    const homeHeroTitle = name;
    const homeHeroSubtitle = v2Config.metadata?.tagline || '';
    const homePhilosophyText = '';
    const aboutSubHeading = '';
    const aboutText = description;
    const aboutPhilosophyHeading = 'Philosophy';
    const aboutPhilosophy = '';
    const diarySubheading = '';
    const contactSubheading = '';
    const customPageIntros: Record<string, string> = {};

    // AWIE Pages (V2): the navigation is derived from the V2.6 ThemeConfig
    // produced by the Golden Path (the single source of truth). The tenant
    // header renders these dynamic menu items instead of the hardcoded
    // DIARY/ABOUT/CONTACT set.
    const pageContentByPath: Record<string, string> = {
      '/diary': diarySubheading,
      '/about': aboutPhilosophyHeading,
      '/contact': contactSubheading,
      ...customPageIntros,
    };
    // STEP 15-E — Preserve the legacy navigation while connecting AWIE output.
    //
    // The legacy V2.6 navigation is HOME / DIARY / ABOUT / CONTACT. AWIE's
    // `resources.pages` may contain only a HOME entry (Gallery/Products live in
    // `resources.sections`), so replacing the defaults with `resources.pages`
    // would drop the core menu. Instead we START from the legacy defaults and
    // APPEND AWIE pages/menu entries whose path is not already present. This
    // preserves HOME/DIARY/ABOUT/CONTACT and surfaces AWIE-generated entries
    // (Gallery, Products, etc.) as real navigation items.
    const v2Pages = v2Config.resources?.pages ?? [];
    const v2Menus = v2Config.resources?.menus ?? [];

    const generatedPages: SitePage[] = [...getDefaultPages(name)];
    const seenPaths = new Set(generatedPages.map((p) => p.path));

    const appendPage = (
      label: string,
      path: string,
      type: SitePage['type'],
      content: string
    ) => {
      if (seenPaths.has(path)) return;
      seenPaths.add(path);
      generatedPages.push({
        id: crypto.randomUUID(),
        label,
        path,
        type,
        visible: true,
        order: generatedPages.length,
        content,
      });
    };

    // FIX B — Connect AWIE `resources.pages` (page entries) to the navigation.
    for (const page of v2Pages) {
      const label = page.title || 'New Page';
      const path = page.route || '/';
      const type: SitePage['type'] = page.isHome ? 'home' : 'custom';
      const content =
        pageContentByPath[path] ||
        (type === 'custom'
          ? `${label} 페이지입니다. 이곳에 내용을 채워 넣으세요.`
          : '');
      appendPage(label, path, type, content);
    }

    // FIX B — Connect AWIE `resources.menus` (navigation menu items) to the
    // existing navigation/page structure. Menu targets are route paths or
    // resource ids; we map them to SitePage entries so the existing
    // Header/Navigation renders them as clickable items.
    for (const menu of v2Menus) {
      for (const item of menu.items ?? []) {
        const target = item.target;
        const path =
          typeof target === 'string' && target.startsWith('/')
            ? target
            : `/${target}`;
        appendPage(item.label || 'Menu', path, 'custom', '');
      }
    }

    // AWIE Sections (V2): the ordered homepage section list is derived from the
    // V2.6 ThemeConfig sections. The tenant renderer iterates this array to
    // build the one-page (SPA) layout.
    const v2Sections = v2Config.resources?.sections ?? [];
    const validSections = v2Sections
      .map((s) => s.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    // STEP 15-C — The V2.6 ThemeConfig is the persisted site configuration. It
    // is stored as JSON on the site record (the DB column is a JSON blob). The
    // explicit adapter maps the already-generated pages/content/sections into
    // the legacy ThemeConfig shape the existing Renderer consumes.
    const themeConfig: ThemeConfig = toLegacyThemeConfig(v2Config, {
      heroTitle: homeHeroTitle,
      heroSubtitle: homeHeroSubtitle,
      aboutBio: aboutText,
      pages: generatedPages,
    });
    if (validSections.length > 0) {
      themeConfig.sections = validSections;
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

    // AWIE V2 — Optional Enrichment (Gap Analysis).
    //
    // The initial site is ALWAYS generated immediately (above). Enrichment is
    // OPTIONAL and NEVER blocks one-line generation. Here we run the
    // provider-independent Gap Analyzer against the pipeline's semantic outputs
    // (DecisionPlan, ContentPlan, evidence) to detect high-value information
    // gaps. When gaps exist, we return a small set (max 3–5) of enrichment
    // questions the UI may offer AFTER the site is built. The client can answer,
    // skip, or finish later — the site already exists either way.
    //
    // SAFETY: only safe, semantic question metadata is returned to the client.
    // No internal Brain structures, no ThemeConfig, no Renderer concepts.
    const enrichment = new EnrichmentService().analyze({
      decisionPlan: pipeline.plan,
      contentPlan: pipeline.contentPlan,
      evidence: pipeline.meaning.evidence,
      // Forward the original prompt so the enrichment language resolver can
      // detect the input language (e.g. Korean) instead of falling back to the
      // canonical default (English). The question text is localized to the
      // detected language; the slot/intent remain canonical Question Engine ids.
      prompt: trimmed,
    });

    // The enrichment metadata is OPTIONAL and never blocks the initial build.
    // When no gaps exist, enrichmentReady is false and the response shape is
    // unchanged from the canonical one-line path (the client can ignore it).
    return NextResponse.json({
      success: true,
      siteId,
      enrichment: {
        enrichmentReady: enrichment.enrichmentReady,
        priority: enrichment.priority,
        questions: enrichment.questions.map((q) => ({
          id: q.id,
          slot: q.slot,
          text: q.text,
          intent: q.intent,
          gapCapability: q.gapCapability,
        })),
      },
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

