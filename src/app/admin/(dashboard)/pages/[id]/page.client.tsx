'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { AdminLoading } from '@/components/admin/AdminLoading';
import { useToast } from '@/hooks/useToast';
import type { SitePage } from '@/lib/db/types';

export default function EditPageClient() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const id = typeof params.id === 'string' ? params.id : '';

  const [page, setPage] = useState<SitePage | null>(null);
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/pages/${id}`)
      .then((res) => res.json() as Promise<{ success?: boolean; page?: SitePage }>)
      .then((data) => {
        if (data.success && data.page) {
          setPage(data.page);
          setLabel(data.page.label);
          setPath(data.page.path);
          setContent(data.page.content ?? '');
        } else {
          toast.addToast('Page not found.', 'error');
          router.push('/admin/pages');
        }
      })
      .catch(() => {
        toast.addToast('Failed to load page.', 'error');
        router.push('/admin/pages');
      })
      .finally(() => setIsLoading(false));
  }, [id, router, toast]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, path, content }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        toast.addToast('Page saved successfully.', 'success');
      } else {
        toast.addToast(result.message || 'Failed to save page.', 'error');
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <AdminLoading message="Loading page..." />;
  }

  if (!page) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-stone-950">
            Edit Page
          </h1>
          <p className="mt-2 text-stone-600">
            Update the menu label, path, and content for this page.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/admin/pages')}>
          <ArrowLeft aria-hidden="true" size={16} className="mr-2" />
          Back to Pages
        </Button>
      </div>

      <form onSubmit={onSubmit}>
        <Card className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Menu Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. 작품보기"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="path">Path</Label>
              <Input
                id="path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="e.g. /works"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Page Content (Markdown / HTML)</Label>
            <Textarea
              id="content"
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the content for this page. It will be rendered on the public custom page."
            />
            <p className="text-xs text-stone-500">
              Supports Markdown and inline HTML.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Page'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
