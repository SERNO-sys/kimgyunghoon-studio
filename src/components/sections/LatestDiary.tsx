import Link from 'next/link';

import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { DiaryItem } from '../../types/diary';

interface LatestDiaryProps {
  diaries: DiaryItem[];
}

export function LatestDiary({ diaries }: LatestDiaryProps) {
  return (
    <section aria-labelledby="latest-diary-heading" className="border-y border-stone-200 bg-[#fffdf8] py-18 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">COMPOSITION NOTES</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl" id="latest-diary-heading">
              Latest Diary
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-stone-700 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
            href="/diary"
          >
            모든 일기 보기
          </Link>
        </div>
        {diaries.length > 0 ? (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {diaries.map((item) => (
              <Card className="flex h-full flex-col" key={item.slug}>
                <p className="text-xs font-medium tracking-[0.14em] text-stone-500">
                  {String(item.number).padStart(3, '0')} · {item.date}
                </p>
                <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950">{item.title}</h3>
                <p className="mt-3 flex-1 leading-7 text-stone-600">{item.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <Link
                  className="mt-6 text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                  href={`/diary/${item.slug}`}
                >
                  일기 읽기
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-stone-600">등록된 작곡 일기가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
