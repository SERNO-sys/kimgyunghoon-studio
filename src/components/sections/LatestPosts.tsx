import { PostCard } from '@/components/posts/PostCard';
import type { Post } from '@/lib/db/types';

interface LatestPostsProps {
  id?: string;
  posts: Post[];
  title?: string;
  subtitle?: string;
  emptyText?: string;
  basePath?: string;
  themeColors?: {
    background: string;
    foreground: string;
    primary: string;
    card: string;
  };
}

export function LatestPosts({
  id,
  posts,
  title,
  subtitle,
  emptyText = '등록된 포스트가 없습니다.',
  basePath,
  themeColors,
}: LatestPostsProps) {
  return (
    <section
      id={id}
      className="py-16 sm:py-24"
      style={
        themeColors ? { backgroundColor: themeColors.background } : undefined
      }
    >

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {subtitle || title ? (
          <div className="mb-8">
            {subtitle ? (
              <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">
                {subtitle}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                {title}
              </h2>
            ) : null}
          </div>
        ) : null}

        {posts.length > 0 ? (
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {posts.slice(0, 6).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                href={
                  basePath
                    ? `${basePath}/posts/${post.slug}`
                    : `/posts/${post.slug}`
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-stone-600">{emptyText}</p>
        )}
      </div>
    </section>
  );
}
