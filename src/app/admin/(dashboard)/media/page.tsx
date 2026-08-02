'use client';

import { useEffect, useState } from 'react';
import { MediaUploader } from '@/components/admin/media/MediaUploader';
import { MediaGrid } from '@/components/admin/media/MediaGrid';
import { useToast } from '@/hooks/useToast';
import type { MediaItem } from '@/lib/admin/media';

export const runtime = 'edge';


export default function MediaPage() {
  const toast = useToast();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch('/api/admin/media')
      .then((res) => res.json() as Promise<{ success?: boolean; media?: MediaItem[] }>)
      .then((data) => {
        if (data.success && data.media) {
          setMedia(data.media);
        }
      })
      .catch(() => {
        toast.addToast('Failed to load media.', 'error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reloadKey, toast]);

  const loadMedia = () => {
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  };

  const handleDelete = async (item: MediaItem) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/media?id=${item.id}`, {
        method: 'DELETE',
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (response.ok && result.success) {
        setMedia((current) => current.filter((m) => m.id !== item.id));
        toast.addToast('Media deleted.', 'success');
      } else {
        toast.addToast(
          result.message || 'Failed to delete media.',
          'error'
        );
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Media Library
        </h1>
        <p className="mt-2 text-stone-600">
          Upload and manage images for your content.
        </p>
      </div>
      <MediaUploader onUploadComplete={loadMedia} />
      {isLoading ? (
        <p className="py-12 text-center text-stone-500">Loading media...</p>
      ) : (
        <MediaGrid media={media} onDelete={handleDelete} />
      )}
    </div>
  );
}
