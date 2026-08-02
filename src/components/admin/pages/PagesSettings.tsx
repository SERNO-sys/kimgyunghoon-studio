'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import type { SitePage } from '@/lib/db/types';

const PAGE_TYPES: { value: SitePage['type']; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'music', label: 'Blog' },
  { value: 'diary', label: 'Journal' },
  { value: 'about', label: 'About' },
  { value: 'contact', label: 'Contact' },
  { value: 'custom', label: 'Custom' },
];

function createPage(order: number): SitePage {
  return {
    id: crypto.randomUUID(),
    label: 'New Page',
    path: '/new-page',
    type: 'custom',
    visible: true,
    order,
  };
}

export function PagesSettings() {
  const toast = useToast();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/pages')
      .then((res) => res.json() as Promise<{ success?: boolean; [key: string]: unknown }>)
      .then((data) => {
        if (data.success && Array.isArray(data.pages)) {
          setPages(data.pages);
        }
      })
      .catch(() => {
        toast.addToast('Failed to load pages.', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  const updatePage = (id: string, updates: Partial<SitePage>) => {
    setPages((current) =>
      current.map((page) => (page.id === id ? { ...page, ...updates } : page))
    );
  };

  const removePage = (id: string) => {
    setPages((current) => current.filter((page) => page.id !== id));
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pages.length) return;
    setPages((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(newIndex, 0, moved);
      return next.map((page, i) => ({ ...page, order: i }));
    });
  };

  const addPage = () => {
    setPages((current) => {
      if (current.length >= 8) {
        toast.addToast('메뉴는 최대 8개까지 생성 가능합니다.', 'error');
        return current;
      }
      return [...current, createPage(current.length)];
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
      if (response.ok && result.success) {
        toast.addToast('Navigation saved successfully.', 'success');
      } else {
        toast.addToast(result.message || 'Failed to save navigation.', 'error');
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-stone-600">Loading navigation...</p>;
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-4">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="grid grid-cols-1 gap-4 rounded-sm border border-stone-200 bg-[#fffdf8] p-4 sm:grid-cols-12"
          >
            <div className="sm:col-span-3 space-y-2">
              <Label htmlFor={`label-${page.id}`}>Label</Label>
              <Input
                id={`label-${page.id}`}
                value={page.label}
                onChange={(e) => updatePage(page.id, { label: e.target.value })}
                placeholder="e.g. Blog"
              />
            </div>
            <div className="sm:col-span-3 space-y-2">
              <Label htmlFor={`path-${page.id}`}>Path</Label>
              <Input
                id={`path-${page.id}`}
                value={page.path}
                onChange={(e) => updatePage(page.id, { path: e.target.value })}
                placeholder="e.g. /blog"
              />
            </div>
            <div className="sm:col-span-3 space-y-2">
              <Label htmlFor={`type-${page.id}`}>Type</Label>
              <Select
                id={`type-${page.id}`}
                value={page.type}
                onChange={(e) =>
                  updatePage(page.id, { type: e.target.value as SitePage['type'] })
                }
              >
                {PAGE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end justify-end gap-2 sm:col-span-3 pb-1">
              <button
                aria-label="Move up"
                className="rounded-sm p-2 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                disabled={index === 0}
                onClick={() => movePage(index, -1)}
                type="button"
              >
                ↑
              </button>
              <button
                aria-label="Move down"
                className="rounded-sm p-2 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                disabled={index === pages.length - 1}
                onClick={() => movePage(index, 1)}
                type="button"
              >
                ↓
              </button>
              <button
                aria-label="Remove page"
                className="rounded-sm p-2 text-red-600 hover:bg-red-50"
                onClick={() => removePage(page.id)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="flex items-end justify-end gap-2 sm:col-span-12 pb-1">
              <Link
                href={`/admin/pages/${encodeURIComponent(page.id)}`}
                className="inline-flex items-center rounded-sm border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-900 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50"
              >
                Edit content
              </Link>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={addPage}>
          Add page
        </Button>
        <Button disabled={saving} type="submit">
          {saving ? 'Saving...' : 'Save navigation'}
        </Button>
      </div>
    </form>
  );
}
