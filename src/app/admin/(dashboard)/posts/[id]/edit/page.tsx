'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLoading } from '@/components/admin/AdminLoading';
import { PostForm } from '@/components/admin/posts/PostForm';
import { useToast } from '@/hooks/useToast';
import type { Post } from '@/lib/admin/posts';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const id = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.post) {
          setPost(data.post);
        } else {
          toast.addToast('Post not found.', 'error');
          router.push('/admin/posts');
        }
      })
      .catch(() => {
        toast.addToast('Failed to load post.', 'error');
        router.push('/admin/posts');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, router, toast]);

  if (isLoading) {
    return <AdminLoading message="Loading post..." />;
  }

  if (!post) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Edit Post
        </h1>
        <p className="mt-2 text-stone-600">Update your post content.</p>
      </div>
      <Card>
        <PostForm post={post} />
      </Card>
    </div>
  );
}
