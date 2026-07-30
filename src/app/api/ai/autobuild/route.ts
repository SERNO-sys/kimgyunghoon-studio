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
import { getCurrentUserTier, TIER_LIMITS } from '@/lib/config/tiers';
import { getDefaultPages } from '@/lib/site-context';
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
    const hostname = new URL(request.url).hostname;
    const defaultDomain =
      hostname === 'localhost' ? `${siteId}.localhost` : `${siteId}.${hostname}`;

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

    const cleaned = autobuildJson
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```$/, '')
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

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

    const site: Site = {
      id: siteId,
      ownerId: session.userId,
      name,
      description,
      language: 'ko',
      timezone: 'Asia/Seoul',
      theme: 'default',
      maintenance: false,
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
        return {
          id: crypto.randomUUID(),
          label: baseLabel[type] || page.label || 'New Page',
          path,
          type,
          visible: true,
          order: index,
          content: pageContentByPath[path] || baseContent[type] || '',
        };
      });
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
    const message = error instanceof Error ? error.message : 'Failed to build site';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
