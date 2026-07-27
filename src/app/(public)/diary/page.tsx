import { DiaryCard } from '@/components/diary/DiaryCard';
import { getAllDiaries } from '@/lib/diary';

export default async function DiaryPage() {
  const diaries = await getAllDiaries();

  return (
    <main className="bg-[#f8f5ed] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-900">COMPOSITION NOTES</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Composition Diary</h1>
        <p className="mt-5 max-w-2xl leading-8 text-stone-600">
          음악을 만들며 발견한 생각과 배움의 순간을 기록합니다.
        </p>
        {diaries.length > 0 ? (
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {diaries.map((diary) => (
              <DiaryCard diary={diary} key={diary.slug} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-stone-600">등록된 작곡 일기가 없습니다.</p>
        )}
      </div>
    </main>
  );
}
