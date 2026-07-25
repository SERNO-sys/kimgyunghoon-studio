import { MusicCard } from '../../components/music/MusicCard';
import { getAllMusic } from '../../lib/music';

export default async function MusicPage() {
  const music = await getAllMusic();

  return (
    <main className="bg-[#f8f5ed] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">MUSIC ARCHIVE</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Music</h1>
        <p className="mt-5 max-w-2xl leading-8 text-stone-600">
          완성된 음악과 그 안에 담긴 이야기를 기록합니다.
        </p>
        {music.length > 0 ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {music.map((item) => (
              <MusicCard key={item.slug} music={item} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-stone-600">등록된 음악이 없습니다.</p>
        )}
      </div>
    </main>
  );
}
