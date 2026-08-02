import { notFound } from 'next/navigation';

import { getDb } from '@/lib/db/client';
import { getPostBySlug, getSiteById } from '@/lib/db/queries';
import { renderPostContent } from '@/lib/markdown';

interface DiarySlugPageProps {
  params: Promise<{ siteId: string; slug: string }>;
}

export default async function DiarySlugPage({
  params,
}: DiarySlugPageProps) {
  const { siteId, slug } = await params;
  const db = getDb();
  const site = await getSiteById(db, siteId);
  const post = await getPostBySlug(db, siteId, slug);

  if (!site || !post || post.siteId !== siteId) {
    notFound();
  }

  const contentHtml = await renderPostContent(post.content);

  return (
    <article className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <div className="space-y-4 border-b border-stone-200 pb-8 text-center">
        <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
          {post.category}
        </span>
        <h1 className="text-3xl font-serif text-stone-900 font-bold">
          {post.title}
        </h1>
        <time className="text-sm text-stone-500">
          {new Date(post.updatedAt).toLocaleDateString()}
        </time>
      </div>
      <div
        className="markdown-content max-w-none whitespace-pre-line text-stone-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      <div className="pt-8">
        <a
          href={`/sites/${siteId}/diary`}
          className="text-sm font-bold text-amber-800 hover:underline"
        >
          ← Diary 목록으로
        </a>
      </div>
    </article>
  );
}
