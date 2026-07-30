import { PostCard } from '@/components/posts/PostCard';
import { getPublicSiteContext } from '@/lib/site-context';

function getPostDescription(content: string): string {
  return content.slice(0, 200).replace(/[#*`_\[\]]/g, '').trim();
}

export default async function DiaryPage() {
  const { posts, site } = await getPublicSiteContext();

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
      <div className="space-y-4 border-b border-stone-200 pb-8 text-center">
        <span className="text-xs font-bold tracking-widest text-amber-800 uppercase">
          JOURNAL
        </span>
        <h1 className="text-4xl font-serif text-stone-900 font-bold">Journal</h1>
        <p className="text-stone-600">
          {site?.name ?? 'This site'}의 소중한 기록과 이야기를 모았습니다.
        </p>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              href={`/diary/${post.slug}`}
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
