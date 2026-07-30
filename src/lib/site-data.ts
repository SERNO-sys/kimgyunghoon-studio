import { getDb } from '@/lib/db/client';
import {
  getSettingsBySiteId,
  getSiteById,
  listPostsBySite,
} from '@/lib/db/queries';
import { parseSettings } from '@/lib/site-context';
import type { Post, Site, SiteSettings } from '@/lib/db/types';

export interface SiteData {
  site: Site;
  settings: SiteSettings | null;
  posts: Post[];
}

export async function getSiteData(siteId: string): Promise<SiteData | null> {
  const db = getDb();
  const site = await getSiteById(db, siteId);
  if (!site) return null;
  const settings = await getSettingsBySiteId(db, site.id);
  const posts = await listPostsBySite(db, site.id, 'published');
  return { site, settings, posts };
}

export interface MusicPostsData {
  site: Site;
  posts: Post[];
}

export async function getMusicPosts(
  siteId: string
): Promise<MusicPostsData | null> {
  const db = getDb();
  const site = await getSiteById(db, siteId);
  if (!site) return null;
  const posts = (await listPostsBySite(db, site.id, 'published')).filter(
    (post) => post.category.toLowerCase() === 'music'
  );
  return { site, posts };
}

export function getSettingValue(
  settings: SiteSettings | null,
  key: string
): string | undefined {
  if (!settings) return undefined;
  const parsed = parseSettings(settings);
  const flat = { ...parsed.general, ...parsed.contact, ...parsed.social } as Record<
    string,
    unknown
  >;
  const value = flat[key];
  if (value === undefined || value === null) return undefined;
  return String(value);
}
