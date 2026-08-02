import { headers } from 'next/headers';
import { getDb } from '@/lib/db/client';
import {
  getPrimaryDomain,
  getSettingsBySiteId,
  getSiteByDomain,
  getSiteById,
  listPostsBySite,
} from '@/lib/db/queries';
import { themes } from '@/lib/admin/theme';
import type { Post, Site, SitePage, SiteSettings } from '@/lib/db/types';

export interface PublicSiteContext {
  site: Site | null;
  settings: SiteSettings | null;
  posts: Post[];
  domain: string | null;
  isMissing: boolean;
}

export function parseSettings(settings: SiteSettings | null): {
  general: Record<string, unknown>;
  contact: Record<string, unknown>;
  analytics: Record<string, unknown>;
  social: Record<string, unknown>;
  pages: unknown;
} {
  if (!settings) {
    return {
      general: {},
      contact: {},
      analytics: {},
      social: {},
      pages: [],
    };
  }

  return {
    general: safeJsonParse(settings.general, {}) as Record<string, unknown>,
    contact: safeJsonParse(settings.contact, {}) as Record<string, unknown>,
    analytics: safeJsonParse(settings.analytics, {}) as Record<string, unknown>,
    social: safeJsonParse(settings.social, {}) as Record<string, unknown>,
    pages: safeJsonParse(settings.pages, []),
  };
}

export function getDefaultPages(siteName: string): SitePage[] {
  return [
    { id: 'home', label: 'HOME', path: '/', type: 'home', visible: true, order: 0 },
    { id: 'diary', label: 'DIARY', path: '/diary', type: 'diary', visible: true, order: 1 },
    { id: 'about', label: 'ABOUT', path: '/about', type: 'about', visible: true, order: 2 },
    { id: 'contact', label: 'CONTACT', path: '/contact', type: 'contact', visible: true, order: 3 },
  ];
}

export function resolvePages(
  parsedPages: unknown,
  siteName: string
): SitePage[] {
  if (Array.isArray(parsedPages) && parsedPages.length > 0) {
    return parsedPages as SitePage[];
  }
  return getDefaultPages(siteName);
}

function safeJsonParse(value: string, fallback: unknown): unknown {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (typeof parsed !== typeof fallback && !(Array.isArray(fallback) && parsed === null)) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export async function getPublicSiteContext(): Promise<PublicSiteContext> {
  const headersList = await headers();
  const siteId = headersList.get('x-site-id');
  const siteDomain = headersList.get('x-site-domain');

  const db = getDb();

  const site = siteId
    ? await getSiteById(db, siteId)
    : siteDomain
      ? await getSiteByDomain(db, siteDomain)
      : null;

  if (!site) {
    return {
      site: null,
      settings: null,
      posts: [],
      domain: siteDomain,
      isMissing: true,
    };
  }

  // Only render sites that have been published. Unpublished sites are treated
  // as missing so the public subdomain/custom domain does not leak draft data.
  if (!site.isPublished) {
    return {
      site: null,
      settings: null,
      posts: [],
      domain: siteDomain,
      isMissing: true,
    };
  }


  const settings = await getSettingsBySiteId(db, site.id);
  const posts = await listPostsBySite(db, site.id, 'published');
  const primary = await getPrimaryDomain(db, site.id);
  const domain = primary?.domain ?? siteDomain;

  return {
    site,
    settings,
    posts,
    domain,
    isMissing: false,
  };
}

export interface ResolvedSiteConfig {
  name: string;
  description: string;
  email: string;
  phone: string;
  youtubeUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  soundcloudUrl: string;
  spotifyUrl: string;
  threadsUrl: string;
  theme: Site['theme'];
  themeColors: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
  pages: SitePage[];
  bannerTitle: string;
  bannerDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutBio: string;
  aboutPhilosophy: string;
  philosophyText: string;
  heroImageUrl: string;
}

export function findPageByPath(
  pages: SitePage[],
  path: string
): SitePage | null {
  for (const page of pages) {
    if (page.path === path) return page;
    if (Array.isArray(page.children)) {
      const found = findPageByPath(page.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function flattenPages(
  pages: SitePage[],
  prefix = ''
): SitePage[] {
  const result: SitePage[] = [];
  for (const page of pages) {
    result.push(page);
    if (Array.isArray(page.children)) {
      result.push(...flattenPages(page.children));
    }
  }
  return result;
}

export function resolveSiteConfig(
  site: Site | null,
  settings: SiteSettings | null
): ResolvedSiteConfig {
  const parsed = parseSettings(settings);

  const social = parsed.social ?? {};
  const legacyContact = parsed.contact ?? {};

  return {
    name: site?.name ?? '',
    description:
      String(parsed.general?.description ?? site?.description ?? ''),
    email: String(parsed.contact?.email ?? ''),
    phone: String(parsed.contact?.phone ?? ''),
    youtubeUrl: String(
      social.youtube ?? legacyContact.youtube ?? ''
    ),
    instagramUrl: String(
      social.instagram ?? legacyContact.instagram ?? ''
    ),
    twitterUrl: String(
      social.twitter ?? legacyContact.twitter ?? ''
    ),
    tiktokUrl: String(social.tiktok ?? ''),
    facebookUrl: String(social.facebook ?? ''),
    soundcloudUrl: String(social.soundcloud ?? ''),
    spotifyUrl: String(social.spotify ?? ''),
    threadsUrl: String(social.threads ?? ''),
    theme: site?.theme ?? 'default',
    themeColors: (() => {
      const selected = themes.find((t) => t.id === (site?.theme ?? 'default'));
      return (selected ?? themes[0]).colors;
    })(),
    pages: resolvePages(parsed.pages, site?.name ?? ''),
    bannerTitle: String(
      parsed.general?.banner_title ??
        parsed.general?.hero_title ??
        ''
    ),
    bannerDescription: String(
      parsed.general?.banner_description ??
        parsed.general?.hero_subtitle ??
        parsed.general?.description ??
        ''
    ),
    heroTitle: String(parsed.general?.hero_title ?? ''),
    heroSubtitle: String(parsed.general?.hero_subtitle ?? ''),
    aboutBio: String(
      parsed.general?.about_bio ??
        parsed.general?.about_main_bio ??
        parsed.general?.about_text ??
        ''
    ),
    aboutPhilosophy: String(
      parsed.general?.about_philosophy ??
        parsed.general?.philosophy_text ??
        ''
    ),
    philosophyText: String(
      parsed.general?.about_philosophy ??
        parsed.general?.philosophy_text ??
        ''
    ),
    heroImageUrl: String(parsed.general?.hero_image_url ?? '/banner.jpg'),
  };
}
