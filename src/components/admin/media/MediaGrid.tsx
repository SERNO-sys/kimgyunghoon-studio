import { MediaCard } from './MediaCard';
import type { MediaItem } from '@/lib/admin/media';

interface MediaGridProps {
  media: MediaItem[];
  onDelete: (media: MediaItem) => void;
}

export function MediaGrid({ media, onDelete }: MediaGridProps) {
  if (media.length === 0) {
    return (
      <p className="py-12 text-center text-stone-500">
        No media uploaded yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {media.map((item) => (
        <MediaCard key={item.id} media={item} onDelete={onDelete} />
      ))}
    </div>
  );
}
