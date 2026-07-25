export function Philosophy() {
  return (
    <section aria-labelledby="philosophy-heading" className="bg-stone-950 py-18 text-stone-100 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-300">MUSICAL PHILOSOPHY</p>
        <div>
          <h2 className="max-w-3xl font-serif text-3xl font-semibold leading-snug tracking-tight sm:text-4xl" id="philosophy-heading">
            음악은 완성된 결과만이 아니라, 귀 기울이고 망설이며 발견한 시간까지 함께 담아내는 기록입니다.
          </h2>
          <p className="mt-7 max-w-2xl leading-8 text-stone-300">
            이곳에서는 한 곡이 만들어지는 과정과 그 안에 머문 생각을 나눕니다. 오래 남는 음악을 위해, 매 순간의 감각을 소중히 기록합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
