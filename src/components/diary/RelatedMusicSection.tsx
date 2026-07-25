import Link from 'next/link';

import { Card } from '../ui/Card';
import type { MusicItem } from '../../types/music';

interface RelatedMusicSectionProps {
  music: MusicItem[];
}

export function RelatedMusicSection({ music }: RelatedMusicSectionProps) {
  return (
    <section aria-labelledby="related-music-heading" className="border-t border-stone-200 pt-12 sm:pt-16">
      <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">MUSIC ARCHIVE</p>
      <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950" id="related-music-heading">
        Related Music
      </h2>
      {music.length > 0 ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {music.map((item) => (
            <Card className="flex h-full flex-col" key={item.slug}>
              <p className="text-xs font-medium tracking-[0.14em] text-stone-500">{item.date}</p>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
              <p className="mt-3 flex-1 leading-7 text-stone-600">{item.description}</p>
              <Link
                className="mt-6 text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                href={`/music/${item.slug}`}
              >
                곡 이야기 보기
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-7 text-stone-600">연결된 음악이 없습니다.</p>
      )}
    </section>
  );
}
