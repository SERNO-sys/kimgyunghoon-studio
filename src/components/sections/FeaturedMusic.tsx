import Link from 'next/link';

import { Card } from '../ui/Card';
import type { MusicItem } from '../../types/music';

interface FeaturedMusicProps {
  music: MusicItem[];
}

export function FeaturedMusic({ music }: FeaturedMusicProps) {
  return (
    <section aria-labelledby="featured-music-heading" className="bg-[#f8f5ed] py-18 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">SELECTED WORKS</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl" id="featured-music-heading">
              Featured Music
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-stone-700 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
            href="/music"
          >
            모든 음악 보기
          </Link>
        </div>
        {music.length > 0 ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
          <p className="mt-10 text-stone-600">등록된 추천 음악이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
