import Link from 'next/link';

import { Card } from '../ui/Card';
import type { MusicItem } from '../../types/music';

interface MusicCardProps {
  music: MusicItem;
}

export function MusicCard({ music }: MusicCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <p className="text-xs font-medium tracking-[0.14em] text-stone-500">{music.date}</p>
      <h2 className="mt-4 font-serif text-2xl font-semibold text-stone-950">{music.title}</h2>
      <p className="mt-3 flex-1 leading-7 text-stone-600">{music.description}</p>
      <Link
        className="mt-6 text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
        href={`/music/${music.slug}`}
      >
        곡 이야기 보기
      </Link>
    </Card>
  );
}
