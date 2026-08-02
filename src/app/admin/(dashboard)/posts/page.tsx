'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PostsFilter } from '@/components/admin/posts/PostsFilter';
import { PostTable } from '@/components/admin/posts/PostTable';
import { useToast } from '@/hooks/useToast';
import type { Post } from '@/lib/admin/posts';

export default function PostsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setCategory(searchParams.get('category') ?? '');
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/admin/posts')
      .then((res) => res.json() as Promise<{ success?: boolean; posts?: Post[] }>)
      .then((data) => {
        if (data.success && data.posts) {
          setPosts(data.posts);
        }
      })
      .catch(() => {
        toast.addToast('Failed to load posts.', 'error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        search === '' ||
        post.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === '' ||
        post.category.toLowerCase() === category.toLowerCase();
      const matchesStatus =
        status === 'all' || post.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [posts, search, category, status]);

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
        toast.addToast('Post deleted.', 'success');
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
            Posts
          </h1>
          <p className="mt-2 text-stone-600">Manage your website content.</p>
        </div>
        <Button
          asChild
          href={`/admin/posts/new${category ? `?category=${encodeURIComponent(category)}` : ''}`}
          className="inline-flex items-center gap-2"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Post
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
          <p className="py-8 text-center text-stone-500">Loading posts...</p>
        ) : (
          <PostTable posts={filteredPosts} onDelete={handleDelete} />
        )}
      </Card>
    </div>
  );
}
