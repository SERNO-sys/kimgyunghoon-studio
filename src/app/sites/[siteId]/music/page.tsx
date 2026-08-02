import { PostCard } from '@/components/posts/PostCard';
import { findPageByPath, parseSettings, resolvePages } from '@/lib/site-context';
import { getSiteData } from '@/lib/site-data';

export const runtime = 'edge';


interface MusicPageProps {
  params: Promise<{ siteId: string }>;
}

function getPostDescription(content: string): string {
  return content.slice(0, 160).replace(/[#*`_\[\]]/g, '').trim();
}

export default async function MusicPage({ params }: MusicPageProps) {
  const { siteId } = await params;
  const data = await getSiteData(siteId);
  if (!data) return null;

  const { site, settings, posts } = data;
  const parsed = parseSettings(settings);
  const pages = resolvePages(parsed.pages, site?.name ?? '');
  const page = findPageByPath(pages, '/music');
  const pageLabel = page?.label || 'Blog';
  const pageContent = page?.content || `${site.name}의 다양한 이야기와 기록을 남깁니다.`;
  const musicPosts = posts.filter((post) => post.category.toLowerCase() === 'music');

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
      <div className="space-y-4 border-b border-stone-200 pb-8 text-center">
        <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
          {pageLabel}
        </span>
        <h1 className="text-4xl font-serif text-stone-900 font-bold">{pageContent}</h1>
      </div>

      {musicPosts && musicPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {musicPosts.map((post) => (
            <PostCard
              key={post.id}
              href={`/sites/${siteId}/posts/${post.id}`}
              post={post}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-stone-400 border border-dashed border-stone-300 rounded-lg">
          등록된 포스트가 없습니다. 대시보드에서 첫 글을 작성해 보세요.
        </div>
      )}
    </div>
  );
}
