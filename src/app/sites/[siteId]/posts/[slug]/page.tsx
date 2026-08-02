import { notFound } from 'next/navigation';

import { AudioPlayer } from '@/components/music/AudioPlayer';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { getDb } from '@/lib/db/client';
import { getPostBySlug, getSiteById } from '@/lib/db/queries';

export const runtime = 'edge';


interface SitePostPageProps {
  params: Promise<{ siteId: string; slug: string }>;
}

export default async function SitePostPage({ params }: SitePostPageProps) {
  const { siteId, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const db = getDb();
  const site = await getSiteById(db, siteId);
  const post = site ? await getPostBySlug(db, site.id, decodedSlug) : null;

  if (!site || !post || post.siteId !== siteId) {
    notFound();
  }

  return (
    <main className="bg-[#fffdf8] py-12 sm:py-20">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="border-b border-stone-200 pb-10 sm:pb-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">
            {post.category}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            {post.title}
          </h1>
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
        {post.audioUrl ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <AudioPlayer audioUrl={post.audioUrl} />
          </div>
        ) : null}
        <div className="mt-12">
          <MarkdownRenderer content={post.content} />
        </div>
        <div className="pt-8">
          <a
            href={`/sites/${siteId}`}
            className="text-sm font-bold text-amber-800 hover:underline"
          >
            ← 목록으로
          </a>
        </div>
      </article>
    </main>
  );
}
