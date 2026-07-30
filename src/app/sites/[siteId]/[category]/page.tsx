import { PostCard } from '@/components/posts/PostCard';
import { getSiteData } from '@/lib/site-data';
import { resolveSiteConfig } from '@/lib/site-context';

interface CategoryPageProps {
  params: Promise<{ siteId: string; category: string }>;
}

function getPostDescription(content: string): string {
  return content.slice(0, 200).replace(/[#*`_\[\]]/g, '').trim();
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { siteId, category } = await params;
  const data = await getSiteData(siteId);
  if (!data) return null;

  const { site, settings, posts } = data;
  const config = resolveSiteConfig(site, settings);
  const decodedCategory = decodeURIComponent(category);
  const path = `/${decodedCategory}`;

  const page = config.pages.find(
    (p) => p.path === path || p.path === decodedCategory
  );
  const title = page?.label ?? decodedCategory;

  const filteredPosts = posts.filter(
    (post) =>
      post.status === 'published' &&
      (post.category.toLowerCase() === title.toLowerCase() ||
        post.category.toLowerCase() === decodedCategory.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
      <div className="space-y-4 border-b border-stone-200 pb-8 text-center">
        <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
          {title.toUpperCase()}
        </span>
        <h1 className="text-4xl font-serif text-stone-900 font-bold">
          {title}
        </h1>
        <p className="text-stone-600">
          {site.name}의 {title} 콘텐츠를 확인하세요.
        </p>
      </div>

      {page?.content ? (
        <div className="prose prose-stone max-w-none whitespace-pre-line rounded-lg border border-stone-200 bg-stone-50 p-6 text-stone-700 leading-relaxed">
          {page.content}
        </div>
      ) : null}

      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              href={`/sites/${siteId}/posts/${post.slug}`}
              post={post}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-stone-400 border border-dashed border-stone-300 rounded-lg">
          <p className="font-bold text-stone-600 mb-2">{title} 페이지</p>
          <p>
            아직 등록된 {title} 포스트가 없습니다. 대시보드에서 콘텐츠를
            추가해 보세요.
          </p>
        </div>
      )}
    </div>
  );
}
