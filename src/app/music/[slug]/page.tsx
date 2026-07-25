import { notFound } from 'next/navigation';

import { RelatedDiarySection } from '../../../components/music/RelatedDiarySection';
import { YoutubePlayer } from '../../../components/music/YoutubePlayer';
import { getAllMusic, getMusicBySlug } from '../../../lib/music';
import { getRelatedDiaries } from '../../../lib/relations';

interface MusicDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const music = await getAllMusic();

  return music.map((item) => ({ slug: item.slug }));
}

export default async function MusicDetailPage({ params }: MusicDetailPageProps) {
  const { slug } = await params;
  const music = await getMusicBySlug(slug);

  if (!music) {
    notFound();
  }

  const relatedDiaries = await getRelatedDiaries(music);

  return (
    <main className="bg-[#fffdf8] py-12 sm:py-20">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="border-b border-stone-200 pb-10 sm:pb-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">MUSIC ARCHIVE · {music.date}</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">{music.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">{music.description}</p>
        </header>
        <div className="mt-10">
          <YoutubePlayer title={music.title} youtubeId={music.youtubeId} />
        </div>
        <div
          className="mt-12 text-[1.0625rem] leading-8 text-stone-700 [&_h1]:mt-12 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:mt-5 [&_ul]:mt-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: music.html }}
        />
        <div className="mt-14 sm:mt-20">
          <RelatedDiarySection diaries={relatedDiaries} />
        </div>
      </article>
    </main>
  );
}
