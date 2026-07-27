import { Card } from '@/components/ui/Card';
import { PostForm } from '@/components/admin/posts/PostForm';

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Create Post
        </h1>
        <p className="mt-2 text-stone-600">Write and publish a new post.</p>
      </div>
      <Card>
        <PostForm />
      </Card>
    </div>
  );
}
