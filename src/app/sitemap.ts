import type { MetadataRoute } from 'next';

import { getAllDiaries } from '../lib/diary';
import { getAllMusic } from '../lib/music';
import { siteConfig } from '../lib/site';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [music, diaries] = await Promise.all([getAllMusic(), getAllDiaries()]);
  const staticPaths = ['', '/about', '/contact', '/music', '/diary'];

  return [
    ...staticPaths.map((path) => ({ url: `${siteConfig.url}${path}`, lastModified: new Date() })),
    ...music.map((item) => ({ url: `${siteConfig.url}/music/${item.slug}`, lastModified: new Date(item.date) })),
    ...diaries.map((item) => ({ url: `${siteConfig.url}/diary/${item.slug}`, lastModified: new Date(item.date) })),
  ];
}
