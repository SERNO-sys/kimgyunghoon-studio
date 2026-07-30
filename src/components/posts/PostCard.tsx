import type { Post } from '@/lib/db/types';

interface PostCardProps {
  post: Post;
  href: string;
}

function extractFirstMarkdownImage(content: string): string | null {
  const match = content.match(/!\[.*?\]\((.+?)\)/);
  return match?.[1] ?? null;
}

function stripMarkdown(content: string): string {
  return content
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/[#*_`[\]]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function PostCard({ post, href }: PostCardProps) {
  const previewImage = post.featuredImageUrl || extractFirstMarkdownImage(post.content);
  const description = stripMarkdown(post.content).slice(0, 160);

  return (
    <a
      href={href}
      className="group block h-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-stone-50 transition hover:border-amber-700/40 hover:shadow-sm">
        {previewImage ? (
          <div className="aspect-video w-full overflow-hidden">
            <img
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              src={previewImage}
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-6">
          <p className="text-xs font-semibold tracking-widest text-amber-900">
            {post.category}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-stone-900">
            {post.title}
          </h2>
          <p className="mt-3 flex-1 text-sm text-stone-600 line-clamp-3">
            {description ? `${description}…` : ''}
          </p>
          <time className="mt-5 block text-xs text-stone-500">
            {new Date(post.updatedAt).toLocaleDateString()}
          </time>
        </div>
      </article>
    </a>
  );
}
