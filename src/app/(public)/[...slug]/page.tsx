import { notFound } from 'next/navigation';
import {

  findPageByPath,
  getPublicSiteContext,
  resolveSiteConfig,
} from '@/lib/site-context';

export const runtime = 'edge';

interface DynamicPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { slug } = await params;
  const path = '/' + slug.map(decodeURIComponent).join('/');

  const { site, settings } = await getPublicSiteContext();
  const config = resolveSiteConfig(site, settings);

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
          {page.children.map((child) => (
            <a
              key={child.id}
              className="block p-6 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition"
              href={child.path}
            >
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                {child.label}
              </h2>
            </a>
          ))}
        </div>
      ) : null}
    </main>
  );
}
