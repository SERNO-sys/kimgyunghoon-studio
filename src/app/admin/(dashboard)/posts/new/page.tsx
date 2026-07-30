import { Card } from '@/components/ui/Card';
import { PostForm } from '@/components/admin/posts/PostForm';
import { getSession } from '@/lib/admin/session';
import { getDb } from '@/lib/db/client';
import { listSitesByOwner } from '@/lib/db/queries';

interface NewPostPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function NewPostPage({
  searchParams,
}: NewPostPageProps) {
  const { category } = await searchParams;

  const session = await getSession();
  const site = session ? listSitesByOwner(getDb(), session.userId)[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Create Post
        </h1>
        <p className="mt-2 text-stone-600">Write and publish a new post.</p>
      </div>
      <Card>
        <PostForm defaultCategory={category} siteId={site?.id} />
      </Card>
    </div>
  );
}
