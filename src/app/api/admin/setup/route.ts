import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin/session';
import { setupSchema } from '@/lib/admin/setup';
import { getDefaultPages } from '@/lib/site-context';
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
import type { Post, Site, SiteSettings, User } from '@/lib/db/types';

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
    const result = setupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input',
          errors: result.error.flatten(),
        },
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

    const data = result.data;
    const siteId = crypto.randomUUID();

    // The tenant subdomain is the first segment of the site UUID (e.g.
    // `e801f11c` for `e801f11c-xxxx-xxxx-xxxx-xxxxxxxxxxxx`), so the canonical
    // public URL is `https://e801f11c.lucidworker.com`.
    const subdomain = siteId.split('-')[0] || siteId;

    const hostname = new URL(request.url).hostname;
    const customDomain = data.domain?.trim();
    const defaultDomain = hostname === 'localhost'
      ? `${subdomain}.localhost`
      : `${subdomain}.${hostname}`;
    const primaryDomain = customDomain || defaultDomain;


    if (customDomain && await getSiteByDomain(db, customDomain)) {
      return NextResponse.json(
        { success: false, message: 'Custom domain already exists' },
        { status: 409 }
      );
    }

    if (await getSiteByDomain(db, defaultDomain)) {
      return NextResponse.json(
        { success: false, message: 'Site domain already exists' },
        { status: 409 }
      );
    }

    const site: Site = {
      id: siteId,
      ownerId: session.userId,
      name: data.name,
      description: data.description,
      language: 'ko',
      timezone: 'Asia/Seoul',
      theme: data.theme,
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
      domain: primaryDomain,
      verified: true,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const settings: SiteSettings = {
      id: siteId,
      siteId,
      general: JSON.stringify({
        name: data.name,
        description: data.description,
        language: 'ko',
        timezone: 'Asia/Seoul',
        maintenance: false,
        hero_title: 'ABOUT US',
        hero_subtitle:
          '진정성 있는 기록과 이야기를 담아내는 공간입니다.',
        philosophy_text:
          '일상의 감정과 소중한 기록들을 차곡차곡 쌓아갑니다.',
      }),
      contact: JSON.stringify({
        email: data.contactEmail,
        phone: data.contactPhone || '',
      }),
      analytics: '{}',
      social: JSON.stringify(data.social),
      pages: JSON.stringify(getDefaultPages(data.name)),
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
      message: 'Configuration saved and ownership linked',
      siteId,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
