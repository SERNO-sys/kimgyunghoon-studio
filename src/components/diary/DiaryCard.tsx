import Link from 'next/link';

import { Card } from '../ui/Card';
import { TagList } from './TagList';
import type { DiaryItem } from '../../types/diary';

interface DiaryCardProps {
  diary: DiaryItem;
}

export function DiaryCard({ diary }: DiaryCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <p className="text-xs font-medium tracking-[0.14em] text-stone-500">
        {String(diary.number).padStart(3, '0')} · {diary.date}
      </p>
      <h2 className="mt-4 font-serif text-2xl font-semibold text-stone-950">{diary.title}</h2>
      <p className="mt-3 flex-1 leading-7 text-stone-600">{diary.summary}</p>
      <div className="mt-5">
        <TagList tags={diary.tags} />
      </div>
      <Link
        className="mt-6 text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
        href={`/diary/${diary.slug}`}
      >
        일기 읽기
      </Link>
    </Card>
  );
}
