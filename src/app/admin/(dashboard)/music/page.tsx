'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PostsFilter } from '@/components/admin/posts/PostsFilter';
import { PostTable } from '@/components/admin/posts/PostTable';
import { useToast } from '@/hooks/useToast';
import type { Post } from '@/lib/admin/posts';

export const runtime = 'edge';


const MUSIC_CATEGORY = 'Music';

export default function MusicAdminPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    fetch('/api/admin/posts')
      .then((res) => res.json() as Promise<{ success?: boolean; posts?: Post[] }>)
      .then((data) => {
        if (data.success && data.posts) {
          setPosts(
            data.posts.filter(
              (post: Post) =>
                post.category.toLowerCase() === MUSIC_CATEGORY.toLowerCase()
            )
          );
        }
      })
      .catch(() => {
        toast.addToast('Failed to load music posts.', 'error');
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        search === '' ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'all' || post.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [posts, search, status]);

  const handleDelete = async (post: Post) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    try {
      const response = await fetch(`/api/admin/posts/${post.id}`, {
        method: 'DELETE',
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        setPosts((current) => current.filter((p) => p.id !== post.id));
        toast.addToast('Music post deleted.', 'success');
      } else {
        toast.addToast(result.message || 'Failed to delete post.', 'error');
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-950">
            Music
          </h1>
          <p className="mt-2 text-stone-600">Manage your music posts.</p>
        </div>
        <Button
          asChild
          href={`/admin/posts/new?category=${MUSIC_CATEGORY}`}
          className="inline-flex items-center gap-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Music Post
        </Button>
      </div>

      <Card className="space-y-4">
        <PostsFilter
          search={search}
          status={status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
        />
        {isLoading ? (
          <p className="py-8 text-center text-stone-500">Loading music posts...</p>
        ) : (
          <PostTable posts={filteredPosts} onDelete={handleDelete} />
        )}
      </Card>
    </div>
  );
}
