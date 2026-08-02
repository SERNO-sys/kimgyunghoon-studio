import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getDb } from '@/lib/db/client';
import { getPostBySlug } from '@/lib/db/queries';
import { getPublicSiteContext, resolveSiteConfig } from '@/lib/site-context';
import { renderPostContent } from '@/lib/markdown';

export const runtime = 'edge';


interface DiaryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DiaryDetailPageProps): Promise<Metadata> {
  const { site, settings } = await getPublicSiteContext();
  const config = resolveSiteConfig(site, settings);
  const { slug } = await params;
  const db = getDb();
  const post = site ? await getPostBySlug(db, site.id, slug) : null;

  if (!post) {
    return { title: `Not Found | ${config.name}` };
  }

  return {
    title: post.title,
    description: post.content.slice(0, 160),
    alternates: { canonical: `/diary/${post.slug}` },
  };
}

export default async function DiaryDetailPage({ params }: DiaryDetailPageProps) {
  const { site } = await getPublicSiteContext();
  const { slug } = await params;
  const db = getDb();
  const post = site ? await getPostBySlug(db, site.id, slug) : null;

  if (!post) {
    notFound();
  }

  const contentHtml = await renderPostContent(post.content);

  return (
    <main className="bg-[#fffdf8] py-12 sm:py-20">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="border-b border-stone-200 pb-10 sm:pb-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">
            {post.category}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">{post.title}</h1>
          <time className="mt-5 block text-stone-500">
            {new Date(post.updatedAt).toLocaleDateString()}
          </time>
        </header>
        {post.featuredImageUrl ? (
          <figure className="mt-10 overflow-hidden rounded-sm border border-stone-200 shadow-sm">
            <img
              alt={post.title}
              className="aspect-video w-full object-cover"
              src={post.featuredImageUrl}
            />
          </figure>
        ) : null}
        <div
          className="markdown-content mt-12 max-w-none text-[1.0625rem] leading-8 text-stone-700"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>
    </main>
  );
}
