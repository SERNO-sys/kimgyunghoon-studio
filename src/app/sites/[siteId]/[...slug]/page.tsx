import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getSiteData } from '@/lib/site-data';
import { resolveSiteConfig } from '@/lib/site-context';
import { renderPostContent } from '@/lib/markdown';
import type { SitePage } from '@/lib/db/types';

export const runtime = 'edge';

interface CustomPageProps {
  params: Promise<{ siteId: string; slug: string[] }>;
}

/**
 * Resolves an AWIE-generated custom page (themeConfig.pages) by its route path.
 * The layout merges legacy navigation pages with `themeConfig.pages`; custom
 * pages (Gallery, Products, Services, ...) carry `type: 'custom'` and render
 * their `content` (markdown) here. Legacy ABOUT/DIARY/CONTACT routes are
 * handled by their dedicated tenant pages, so this catch-all only serves the
 * AI-generated custom pages.
 */
function findCustomPage(pages: SitePage[], path: string): SitePage | undefined {
  const flat: SitePage[] = [];
  const walk = (list: SitePage[]) => {
    for (const page of list) {
      flat.push(page);
      if (page.children?.length) walk(page.children);
    }
  };
  walk(pages);
  return flat.find((page) => page.path === path && page.type === 'custom');
}

export async function generateMetadata({
  params,
}: CustomPageProps): Promise<Metadata> {
  const { siteId, slug } = await params;
  const data = await getSiteData(siteId);
  if (!data) return { title: 'Not Found' };

  const config = resolveSiteConfig(data.site, data.settings);
  const path = `/${slug.join('/')}`;
  const page = findCustomPage(config.themeConfig.pages ?? [], path);

  return {
    title: page ? `${page.label} | ${config.name}` : `Not Found | ${config.name}`,
  };
}

export default async function CustomPage({ params }: CustomPageProps) {
  const { siteId, slug } = await params;
  const data = await getSiteData(siteId);
  if (!data) {
    notFound();
  }

  const config = resolveSiteConfig(data.site, data.settings);
  const path = `/${slug.join('/')}`;
  const page = findCustomPage(config.themeConfig.pages ?? [], path);

  if (!page) {
    notFound();
  }

  const contentHtml = page.content
    ? await renderPostContent(page.content)
    : '';

  return (
    <main className="bg-[#fffdf8] py-12 sm:py-20">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="border-b border-stone-200 pb-10 sm:pb-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">
            {config.name}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            {page.label}
          </h1>
        </header>
        {contentHtml ? (
          <div
            className="markdown-content mt-12 max-w-none text-[1.0625rem] leading-8 text-stone-700"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <div className="mt-12 rounded-lg border border-dashed border-stone-300 p-12 text-center text-stone-400">
            이 페이지의 콘텐츠가 아직 준비되지 않았습니다.
          </div>
        )}
      </article>
    </main>
  );
}
