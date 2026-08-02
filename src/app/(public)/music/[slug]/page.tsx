import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublicSiteContext } from '@/lib/site-context';
import { renderPostContent } from '@/lib/markdown';

interface MusicDetailPageProps {
  params: Promise<{ slug: string }>;
}

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

function AudioEmbed({ audioUrl }: { audioUrl: string }) {
  const lower = audioUrl.toLowerCase();
  const youtubeId = getYouTubeId(audioUrl);

  if (youtubeId) {
    return (
      <iframe
        className="w-full rounded-lg aspect-video"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title="YouTube audio player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (/\.(mp3|wav|m4a|ogg|aac|flac)(\?.*)?$/.test(lower)) {
    return (
      <audio
        controls
        className="w-full rounded-lg"
        src={audioUrl}
      >
        Your browser does not support the audio element.
      </audio>
    );
  }

  return (
    <a
      href={audioUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-sm bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 transition"
    >
      외부 음원 링크 열기 →
    </a>
  );
}

export default async function MusicDetailPage({ params }: MusicDetailPageProps) {
  const { slug } = await params;
  const { site, posts } = await getPublicSiteContext();

  const post = posts.find(
    (p) =>
      p.slug === slug &&
      p.status === 'published' &&
      p.category.toLowerCase() === 'music'
  );

  if (!post) {
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

      {post.featuredImageUrl ? (
        <figure className="overflow-hidden rounded-sm border border-stone-200 shadow-sm">
          <img
            alt={post.title}
            className="aspect-video w-full object-cover"
            src={post.featuredImageUrl}
          />
        </figure>
      ) : null}

      {post.audioUrl ? (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <AudioEmbed audioUrl={post.audioUrl} />
        </div>
      ) : null}

      <div
        className="markdown-content max-w-none whitespace-pre-line text-stone-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      <div className="pt-8">
        <Link
          href="/music"
          className="text-sm font-bold text-amber-800 hover:underline"
        >
          ← Blog 목록으로
        </Link>
      </div>
    </article>
  );
}
