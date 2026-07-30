import Link from 'next/link';

import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { DiaryItem } from '../../types/diary';

interface RelatedDiarySectionProps {
  diaries: DiaryItem[];
}

export function RelatedDiarySection({ diaries }: RelatedDiarySectionProps) {
  return (
    <section aria-labelledby="related-diary-heading" className="border-t border-stone-200 pt-12 sm:pt-16">
      <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">JOURNAL NOTES</p>
      <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950" id="related-diary-heading">
        Related Journal
      </h2>
      {diaries.length > 0 ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {diaries.map((diary) => (
            <Card className="flex h-full flex-col" key={diary.slug}>
              <p className="text-xs font-medium tracking-[0.14em] text-stone-500">
                {String(diary.number).padStart(3, '0')} · {diary.date}
              </p>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-stone-950">{diary.title}</h3>
              <p className="mt-3 flex-1 leading-7 text-stone-600">{diary.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {diary.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <Link
                className="mt-6 text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                href={`/diary/${diary.slug}`}
              >
                자세히 보기
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-7 text-stone-600">연결된 글이 없습니다.</p>
      )}
    </section>
  );
}
