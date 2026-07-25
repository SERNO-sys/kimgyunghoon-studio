import Link from 'next/link';

export function Hero() {
  return (
    <section className="border-b border-stone-200 bg-[#f1ede3]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-16 lg:px-8 lg:py-36">
        <div>
          <p className="mb-5 text-xs font-semibold tracking-[0.2em] text-amber-900">COMPOSER&apos;S ARCHIVE</p>
          <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
            음악이 태어나는 순간을,
            <br className="hidden sm:block" />
            오래도록 기록합니다.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
            김경훈의 음악과 작곡의 여정을 한곳에 담았습니다. 곡이 완성되기까지의 생각과 소리를 함께 만나보세요.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-stone-950 px-5 py-2.5 text-sm font-semibold tracking-wide text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              href="/music"
            >
              음악 듣기
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-stone-300 px-5 py-2.5 text-sm font-semibold tracking-wide text-stone-900 transition-colors hover:border-stone-950 hover:bg-stone-950 hover:text-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              href="/diary"
            >
              작곡 일기 읽기
            </Link>
          </div>
        </div>
        <blockquote className="border-l-2 border-amber-800 pl-5 text-lg leading-8 text-stone-700 lg:mb-2">
          <p>“한 곡의 음악에는 들리는 소리보다 더 많은 시간이 머뭅니다.”</p>
          <footer className="mt-4 text-xs font-semibold tracking-[0.16em] text-stone-500">KIM GYUNG HOON</footer>
        </blockquote>
      </div>
    </section>
  );
}
