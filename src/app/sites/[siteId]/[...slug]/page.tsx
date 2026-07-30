import { notFound } from 'next/navigation';
import { getSiteData } from '@/lib/site-data';
import { findPageByPath, resolveSiteConfig } from '@/lib/site-context';

interface SiteDynamicPageProps {
  params: Promise<{ siteId: string; slug: string[] }>;
}

export default async function SiteDynamicPage({ params }: SiteDynamicPageProps) {
  const { siteId, slug } = await params;
  const path = '/' + slug.map(decodeURIComponent).join('/');

  const data = await getSiteData(siteId);
  if (!data) {
    notFound();
  }

  const config = resolveSiteConfig(data.site, data.settings);
  const page = findPageByPath(config.pages, path);
  if (!page) {
    notFound();
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">
      <div className="space-y-4 border-b border-stone-200 pb-8 text-center">
        <h1 className="text-4xl font-serif text-stone-900 font-bold">
          {page.label}
        </h1>
      </div>
      {page.content ? (
        <div className="prose prose-stone max-w-none whitespace-pre-line rounded-lg border border-stone-200 bg-stone-50 p-6 text-stone-700 leading-relaxed">
          {page.content}
        </div>
      ) : null}
      {Array.isArray(page.children) && page.children.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {page.children.map((child) => {
            const basePath = child.path === '/' ? '' : child.path;
            const href = `/sites/${siteId}${basePath}`;
            return (
              <a
                key={child.id}
                className="block p-6 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition"
                href={href}
              >
                <h2 className="font-serif text-lg font-semibold text-stone-900">
                  {child.label}
                </h2>
              </a>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
