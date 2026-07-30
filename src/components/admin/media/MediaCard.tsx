'use client';

import { Copy, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { formatFileSize } from '@/lib/admin/media';
import type { MediaItem } from '@/lib/admin/media';

interface MediaCardProps {
  media: MediaItem;
  onDelete: (media: MediaItem) => void;
}

export function MediaCard({ media, onDelete }: MediaCardProps) {
  const toast = useToast();

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(media.url);
      toast.addToast('URL copied to clipboard.', 'success');
    } catch {
      toast.addToast('Failed to copy URL.', 'error');
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-sm bg-stone-100">
        {media.url ? (
          <img
            src={media.url}
            alt={media.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon
            className="absolute inset-0 m-auto size-10 text-stone-400"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-950">
          {media.name}
        </p>
        <p className="text-xs text-stone-500">
          {formatFileSize(media.size)} ·{' '}
          {new Date(media.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="mt-auto flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 gap-2"
          onClick={copyUrl}
        >
          <Copy className="size-4" aria-hidden="true" />
          Copy URL
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(media)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
