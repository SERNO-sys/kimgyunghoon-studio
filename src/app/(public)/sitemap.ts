import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/site';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ['', '/about', '/contact', '/music', '/diary'];

  return staticPaths.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(),
  }));
}
