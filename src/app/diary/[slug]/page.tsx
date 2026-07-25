import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RelatedMusicSection } from '../../../components/diary/RelatedMusicSection';
import { TagList } from '../../../components/diary/TagList';
import { getAllDiaries, getDiaryBySlug } from '../../../lib/diary';
import { getRelatedMusic } from '../../../lib/relations';

interface DiaryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const diaries = await getAllDiaries();

  return diaries.map((diary) => ({ slug: diary.slug }));
}

export async function generateMetadata({ params }: DiaryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const diary = await getDiaryBySlug(slug);

  if (!diary) {
    return {};
  }

  return {
    title: diary.title,
    description: diary.summary,
    alternates: { canonical: `/diary/${diary.slug}` },
    openGraph: { type: 'article', url: `/diary/${diary.slug}`, title: diary.title, description: diary.summary },
    twitter: { card: 'summary', title: diary.title, description: diary.summary },
  };
}

export default async function DiaryDetailPage({ params }: DiaryDetailPageProps) {
  const { slug } = await params;
  const diary = await getDiaryBySlug(slug);

  if (!diary) {
    notFound();
  }

  const relatedMusic = await getRelatedMusic(diary);

  return (
    <main className="bg-[#fffdf8] py-12 sm:py-20">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="border-b border-stone-200 pb-10 sm:pb-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">
            COMPOSITION DIARY · {String(diary.number).padStart(3, '0')} · {diary.date}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">{diary.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">{diary.summary}</p>
          <div className="mt-6">
            <TagList tags={diary.tags} />
          </div>
        </header>
        <div
          className="mt-12 text-[1.0625rem] leading-8 text-stone-700 [&_h1]:mt-12 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:mt-5 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: diary.html }}
        />
        <div className="mt-14 sm:mt-20">
          <RelatedMusicSection music={relatedMusic} />
        </div>
      </article>
    </main>
  );
}
